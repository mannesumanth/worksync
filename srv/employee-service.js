const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const db = await cds.connect.to('db');

    const {
        EMPLOYEES,
        EMPLOYEE_SKILLS,
        ALLOCATIONS,
        LEAVE_CALENDAR,
        SKILLS,
        PROJECTS
    } = cds.entities('worksync.db');

    async function generateBusinessId(req, sequenceName, prefix) {
        const tx = cds.tx(req);
        const result = await tx.run(
            `SELECT "${sequenceName}".NEXTVAL AS SEQ FROM DUMMY`
        );
        const seq = result[0].SEQ;
        return `${prefix}${String(seq).padStart(4, '0')}`;
    }

    async function getCurrentEmployee(req) {
        const employee = await db.run(
            SELECT.one.from(EMPLOYEES)
                .where({
                    EMAIL: req.user.id 
                })
        );
        console.log("Logged User:", req.user.id);
        console.log("Employee:", employee);
        return employee;
    }

    this.on('READ', 'MyProfile', async req => {
        console.log("User =", req.user);
        const email = req.user.id; //'manne.sumanth@amista.com';//req.user.id; 
        console.log("Email =", email);
        return await db.run(
            SELECT.one
                .from(EMPLOYEES)
                .where({ EMAIL: email })
        );
    });

    this.on('READ', 'MySkills', async req => {
        const employee = await getCurrentEmployee(req);

        if (!employee) { return [];}
        const skills = await db.run(
            SELECT.from(EMPLOYEE_SKILLS)
                .where({
                    employee_ID: employee.ID
                })
        );
        for (const skill of skills) {
            const skillData = await db.run(
                SELECT.one.from(SKILLS)
                    .where({
                        ID: skill.skill_ID
                    })
            );
            skill.SKILL_NAME = skillData?.SKILL_NAME;
        }
        return skills;
    });

    this.on('READ', 'MyProjects', async req => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return [];
        }
        const allocations = await db.run(
            SELECT.from(ALLOCATIONS)
                .where({
                    employee_ID: employee.ID
                })
        );
        for (const allocation of allocations) {
            const project = await db.run(
                SELECT.one
                    .from(PROJECTS)
                    .where({
                        ID: allocation.project_ID
                    })
            );
            allocation.PROJECT_NAME =
                project?.PROJECT_NAME;
            allocation.DESCRIPTION =
                project?.DESCRIPTION;
            allocation.PROJECT_PRIORITY =
                project?.PRIORITY;
            allocation.PROJECT_STATUS =
                project?.STATUS;
            allocation.PROJECT_PROGRESS =
                project?.PROJECT_PROGRESS;
            allocation.PROJECT_START_DATE =
                project?.START_DATE;
            allocation.PROJECT_END_DATE =
                project?.END_DATE;
            allocation.PROJECT_ID = project?.PROJECT_ID;
        }
        return allocations;
    });

    this.on('READ', 'MyLeaves', async req => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return [];
        }
        const leaves = await db.run(
            SELECT.from(LEAVE_CALENDAR)
                .where({
                    employee_ID: employee.ID
                })
        );
        leaves.forEach(leave => {
            const from = new Date(leave.LEAVE_FROM);
            const to = new Date(leave.LEAVE_TO);
            leave.DAYS =
                Math.round(
                    (to.getTime() - from.getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1;
        });
        return leaves;
    });

    this.on('ApplyLeave', async req => {
        const db = await cds.connect.to('db');
        const employee = await getCurrentEmployee(req);
        const leaveId = await generateBusinessId(
            req,
            'LEAVE_SEQ',
            'LEV'
        );
        if (req.data.leaveFrom > req.data.leaveTo) {
            req.error(400,
                'Leave From date cannot be greater than Leave To date');
        }
        await db.run(INSERT.into(LEAVE_CALENDAR).entries({
            LEAVE_ID: leaveId,
            employee_ID: employee.ID,
            LEAVE_TYPE: req.data.leaveType,
            LEAVE_FROM: req.data.leaveFrom,
            LEAVE_TO: req.data.leaveTo,
            REASON: req.data.reason,
            STATUS: 'PENDING'
        })
        );
        return {
            message: 'Leave request submitted successfully'
        };
    });

    this.after("READ", "MyProfile", async (employees) => {
        if (!employees) {
            return;
        }
        if (!Array.isArray(employees)) {
            employees = [employees];
        }
        for (const employee of employees) {
            const allocations = await db.run(
                SELECT.from(ALLOCATIONS)
                    .where({
                        employee_ID: employee.ID
                    })
            );
            employee.ALLOCATION_PERCENT =
                allocations.reduce(
                    (sum, allocation) =>
                        sum + Number(
                            allocation.ALLOCATION_PERCENTAGE || 0
                        ),
                    0
                );
            // console.log(
            //     employee.NAME,
            //     employee.ALLOCATION_PERCENT
            // );
        }
    });

    this.before('CREATE', LEAVE_CALENDAR, async (req) => {
        req.data.LEAVE_ID = await generateBusinessId(req, 'LEAVE_SEQ', 'LEV');
    });
    this.on('CancelLeave', async req => {
        const db = await cds.connect.to('db');
        await db.run(UPDATE(LEAVE_CALENDAR)
            .set({
                STATUS: 'CANCELLED'
            })
            .where({
                ID: req.data.leaveId
            })
        );
        return {
            message: 'Leave cancelled successfully'
        };

    });
});