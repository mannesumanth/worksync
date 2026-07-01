const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const {
        EMPLOYEES,
        DESIGNATIONS,
        SKILL_CATEGORIES,
        SKILLS,
        EMPLOYEE_SKILLS,
        PROJECTS,
        ALLOCATIONS,
        LEAVE_CALENDAR,
        PROJECT_REQUIREMENTS,
        LEAVE_BALANCE,
        REQUIREMENT_SKILLS,
    } = this.entities;

    // HELPER: Generate business ID from HANA sequence

    async function generateBusinessId(req, sequenceName, prefix) {
        const tx = cds.tx(req);
        const result = await tx.run(
            `SELECT "${sequenceName}".NEXTVAL AS SEQ FROM DUMMY`
        );
        const seq = result[0].SEQ;
        return `${prefix}${String(seq).padStart(4, '0')}`;
    }

    // BEFORE CREATE: ID generation hooks

    this.before('CREATE', EMPLOYEES, async (req) => {

        req.data.EMP_ID = await generateBusinessId(req, 'EMPLOYEE_SEQ', 'EMP');
        console.log('Generated EMP_ID:', req.data.EMP_ID);
    });

    this.after('CREATE', EMPLOYEES, async (employee) => {

        await cds.run(INSERT.into(LEAVE_BALANCE).entries({
            employee_ID: employee.ID,
            YEAR: new Date().getFullYear(),

            CASUAL_AVAILABLE: 1,
            CASUAL_USED: 0,

            SICK_AVAILABLE: 1,
            SICK_USED: 0,

            EARNED_AVAILABLE: 0,
            EARNED_USED: 0
        })
        );

    });

    this.before('CREATE', DESIGNATIONS, async (req) => {
        req.data.DESIGNATION_ID = await generateBusinessId(req, 'DESIGNATION_SEQ', 'DES');
        console.log('Generated DESIGNATION_ID:', req.data.DESIGNATION_ID);
    });

    this.before('CREATE', SKILL_CATEGORIES, async (req) => {
        req.data.CAT_ID = await generateBusinessId(req, 'CATEGORY_SEQ', 'CAT');
    });

    this.before('CREATE', SKILLS, async (req) => {
        req.data.SKILL_ID = await generateBusinessId(req, 'SKILL_SEQ', 'SKL');
    });

    this.before('CREATE', PROJECTS, async (req) => {
        req.data.PROJECT_ID = await generateBusinessId(req, 'PROJECTS_SEQ', 'PRJ');
    });

    this.before('CREATE', ALLOCATIONS, async (req) => {
        req.data.ALLOCATION_ID = await generateBusinessId(req, 'ALLOCATION_SEQ', 'ALO');
    });

    // FIX: Added missing ID generation for PROJECT_REQUIREMENTS
    this.before('CREATE', PROJECT_REQUIREMENTS, async (req) => {
        req.data.REQUIREMENT_ID = await generateBusinessId(req, 'REQUIREMENT_SEQ', 'REQ');
        console.log("Generated:", req.data.REQUIREMENT_ID);
    });

    // ALLOCATION VALIDATION: Total allocation must not exceed 100%
    this.before('CREATE', ALLOCATIONS, async (req) => {
        const { employee_ID, ALLOCATION_PERCENTAGE, START_DATE, END_DATE } = req.data;

        if (!employee_ID || !ALLOCATION_PERCENTAGE) return;

        // Sum existing active allocations for this employee
        const result = await cds.run(
            SELECT.from(ALLOCATIONS)
                .columns('SUM(ALLOCATION_PERCENTAGE) as TOTAL')
                .where({ employee_ID })
        );

        const currentTotal = result[0]?.TOTAL || 0;
        const newTotal = parseFloat(currentTotal) + parseFloat(ALLOCATION_PERCENTAGE);

        if (newTotal > 100) {
            req.error(400,
                `Allocation exceeds 100%. Employee is already allocated ${currentTotal}%. ` +
                `You are trying to add ${ALLOCATION_PERCENTAGE}% (Total would be ${newTotal}%).`
            );
        }
    });

    // ON READ EMPLOYEES: Compute virtual ALLOCATION_PERCENT

    this.after('READ', EMPLOYEES, async (employees) => {
        if (!employees) return;

        const aEmployees = Array.isArray(employees) ? employees : [employees];

        for (const emp of aEmployees) {
            if (!emp.ID) continue;

            const result = await cds.run(
                SELECT.from(ALLOCATIONS)
                    .columns('SUM(ALLOCATION_PERCENTAGE) as TOTAL')
                    .where({ employee_ID: emp.ID })
            );

            emp.ALLOCATION_PERCENT = parseFloat(result[0]?.TOTAL || 0);
        }
    });


    // LEAVE APPROVAL: Action to approve or reject a leave request

    this.on('ApproveLeave', async (req) => {
        const { leaveId, status } = req.data;

        if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return req.error(400, 'Status must be APPROVED, REJECTED or PENDING');
        }
        const oLeave = await cds.run(
            SELECT.one.from(LEAVE_CALENDAR).where({ ID: leaveId })
        );
        if (!oLeave) {
            return req.error(404, `Leave request ${leaveId} not found`);
        }
        if (oLeave.STATUS !== 'PENDING') {
            return req.error(400, `Leave request is already ${oLeave.STATUS}`);
        }
        await cds.run(
            UPDATE(LEAVE_CALENDAR)
                .set({ STATUS: status })
                .where({ ID: leaveId })
        );
        return { message: `Leave ${status.toLowerCase()} successfully` };
    });


    // SKILL MATCHING: Recommend employees based on skill + availability

    this.on('RecommendResources', async (req) => {

        const db = await cds.connect.to('db');

        const { projectId } = req.data;

        console.log("Project ID:", projectId);

        // Get project requirements
        const requirements = await db.run(
            SELECT.from(PROJECT_REQUIREMENTS)
                .where({ project_ID: projectId })
        );

        console.log("Requirements:", requirements.length);

        if (!requirements.length) {
            return [];
        }

        const requirementIds = requirements.map(r => r.ID);

        const requirementSkills = await db.run(
            SELECT.from(REQUIREMENT_SKILLS)
                .where({
                    requirement_ID: { in: requirementIds }
                })
        );
        console.log(
            "Requirement Skills:",
            requirementSkills.length
        );

        if (!requirementSkills.length) {
            return [];
        }

        const employees = await db.run(
            SELECT.from(EMPLOYEES)
                .where({ STATUS: 'ACTIVE' })
        );

        const recommendations = [];

        for (const emp of employees) {

            const employeeSkills = await db.run(
                SELECT.from(EMPLOYEE_SKILLS)
                    .where({
                        employee_ID: emp.ID
                    })
            );

            let matchedSkills = 0;

            for (const reqSkill of requirementSkills) {

                const match = employeeSkills.find(es =>
                    es.skill_ID === reqSkill.skill_ID &&
                    es.PROFICIENCY_LEVEL >= reqSkill.REQUIRED_LEVEL
                );

                if (match) {
                    matchedSkills++;
                }
            }

            if (matchedSkills > 0) {

                const allocations = await db.run(
                    SELECT.from(ALLOCATIONS)
                        .where({
                            employee_ID: emp.ID,
                            STATUS: 'ACTIVE'
                        })
                );

                const allocationPercent =
                    allocations.reduce(
                        (sum, a) =>
                            sum + Number(a.ALLOCATION_PERCENTAGE || 0),
                        0
                    );

                recommendations.push({
                    ID: emp.ID,
                    EMP_ID: emp.EMP_ID,
                    NAME: emp.NAME,
                    EMAIL: emp.EMAIL,

                    MATCHED_SKILLS: matchedSkills,
                    TOTAL_SKILLS: requirementSkills.length,

                    MATCH_PERCENT:
                        (matchedSkills * 100) /
                        requirementSkills.length,

                    ALLOCATION_PERCENT: allocationPercent,
                    AVAILABLE_PERCENT:
                        Math.max(0, 100 - allocationPercent)
                });
            }
        }

        return recommendations.sort(
            (a, b) =>
                b.MATCH_PERCENT - a.MATCH_PERCENT ||
                b.AVAILABLE_PERCENT - a.AVAILABLE_PERCENT
        );
    });

    // SPOF DETECTION: Find skills owned by only one active employee

    this.on('DetectSPOF', async (req) => {

        // Count employees per skill (only ACTIVE employees)
        const activeEmployees = await cds.run(
            SELECT.from(EMPLOYEES).columns('ID').where({ STATUS: 'ACTIVE' })
        );
        const activeIds = activeEmployees.map(e => e.ID);

        if (!activeIds.length) return [];

        const skillCounts = await cds.run(
            SELECT.from(EMPLOYEE_SKILLS)
                .columns('skill_ID', 'COUNT(employee_ID) as EMP_COUNT')
                .where({ employee_ID: { in: activeIds } })
                .groupBy('skill_ID')
        );

        // Filter skills with only 1 employee
        const spofSkillIds = skillCounts
            .filter(s => parseInt(s.EMP_COUNT) === 1)
            .map(s => s.skill_ID);

        if (!spofSkillIds.length) return [];

        // Get skill details
        const aSkills = await cds.run(
            SELECT.from(SKILLS).where({ ID: { in: spofSkillIds } })
        );

        // Get the single employee for each SPOF skill
        const result = [];
        for (const skill of aSkills) {
            const empSkill = await cds.run(
                SELECT.one.from(EMPLOYEE_SKILLS)
                    .where({ skill_ID: skill.ID, employee_ID: { in: activeIds } })
            );
            const emp = empSkill
                ? await cds.run(SELECT.one.from(EMPLOYEES).where({ ID: empSkill.employee_ID }))
                : null;

            result.push({
                skill_ID: skill.ID,
                SKILL_NAME: skill.SKILL_NAME,
                employee_ID: emp?.ID,
                EMPLOYEE_NAME: emp?.NAME,
                EMP_ID: emp?.EMP_ID,
                RISK_LEVEL: 'HIGH'
            });
        }

        return result;
    });

    //  SearchEmployees 

    this.on('SearchEmployees', async (req) => {
        const {
            search,
            status,
            designation,
            minExp,
            skip = 0,
            top = 20
        } = req.data;

        let query = SELECT.from(EMPLOYEES);

        if (search) {
            const pattern = `%${search.toLowerCase()}%`;
            query.where`
                lower(NAME) LIKE ${pattern}
                OR lower(EMAIL) LIKE ${pattern}
                OR lower(EMP_ID) LIKE ${pattern}
            `;
        }
        if (status) {
            query.where({ STATUS: status });
        }

        if (designation) {
            query.where({ DESIGNATION_ID: designation });
        }

        if (minExp > 0.0) {
            query.where({ EXPERIENCE: { '>=': minExp } });
        }

        query.limit(top, skip);

        return cds.run(query);
    });

    // FORECASTING
    this.on('GetAvailabilityForecast', async () => {

        const activeEmployees = await cds.run(
            SELECT.from(EMPLOYEES)
                .where({ STATUS: 'ACTIVE' })
        );

        const totalEmployees = activeEmployees.length;

        const today = new Date();

        const currentMonthStart =
            new Date(today.getFullYear(), today.getMonth(), 1);

        const currentMonthEnd =
            new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const nextMonthStart =
            new Date(today.getFullYear(), today.getMonth() + 1, 1);

        const nextMonthEnd =
            new Date(today.getFullYear(), today.getMonth() + 2, 0);

        const approvedLeaves = await cds.run(
            SELECT.from(LEAVE_CALENDAR)
                .where({ STATUS: 'APPROVED' })
        );

        const currentMonthEmployees = new Set();
        const nextMonthEmployees = new Set();

        approvedLeaves.forEach(leave => {

            const from = new Date(leave.LEAVE_FROM);
            const to = new Date(leave.LEAVE_TO);

            if (
                from <= currentMonthEnd &&
                to >= currentMonthStart
            ) {
                currentMonthEmployees.add(leave.employee_ID);
            }

            if (
                from <= nextMonthEnd &&
                to >= nextMonthStart
            ) {
                nextMonthEmployees.add(leave.employee_ID);
            }
        });

        const pendingLeaves = await cds.run(
            SELECT.from(LEAVE_CALENDAR)
                .where({ STATUS: 'PENDING' })
        );
        return {
            currentMonthAvailable:
                totalEmployees - currentMonthEmployees.size,

            nextMonthAvailable:
                totalEmployees - nextMonthEmployees.size,

            currentMonthLeaves:
                currentMonthEmployees.size,

            nextMonthLeaves:
                nextMonthEmployees.size,

            pendingLeaves:
                pendingLeaves.length
        };
    });
    this.before("CREATE", "EMPLOYEE_SKILLS", async (req) => {
        const { employee_ID, skill_ID } = req.data;
        const oExisting = await SELECT.one
            .from(EMPLOYEE_SKILLS)
            .where({
                employee_ID,
                skill_ID
            });
        if (oExisting) {
            req.reject(400, "Employee already has this skill.");
        }

    });

});