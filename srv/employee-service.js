const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const db = await cds.connect.to('db');

    const {
        EMPLOYEES,
        EMPLOYEE_SKILLS,
        ALLOCATIONS,
        LEAVE_CALENDAR,
        LEAVE_BALANCE,
        SKILLS,
        PROJECTS
    } = cds.entities('worksync.db');

    // Only these three leave types are governed by a numeric quota (they're
    // the only ones with AVAILABLE/USED columns on LEAVE_BALANCE).
    // MATERNITY / PATERNITY / UNPAID stay unlimited, same as before this change
    // effectively treated every type the same way against one shared pool.
    const LEAVE_TYPE_AVAILABLE_FIELD = {
        CASUAL: 'CASUAL_AVAILABLE',
        SICK: 'SICK_AVAILABLE',
        EARNED: 'EARNED_AVAILABLE'
    };

    // Statuses that still "occupy" a leave-type's quota. APPROVED obviously
    // does; WITHDRAWAL_REQUESTED also does, so the days stay reserved while
    // the withdrawal is pending admin review — otherwise an employee could
    // request a withdrawal and immediately re-book the same days before the
    // admin has acted on the request.
    const RESERVED_STATUSES = ['APPROVED', 'WITHDRAWAL_REQUESTED'];

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
                    EMAIL: req.user.id // 'manne.sumanth@amista.com'
                })
        );
        console.log("Logged User:", req.user.id);
        console.log("Employee:", employee);
        return employee;
    }

    // Fetch this employee's LEAVE_BALANCE row for the given year, creating
    // one with the default 12/12/12 quotas if it doesn't exist yet.
    async function getOrCreateLeaveBalance(employeeId, year) {
        let balance = await db.run(
            SELECT.one.from(LEAVE_BALANCE)
                .where({ employee_ID: employeeId, YEAR: year })
        );
        if (!balance) {
            await db.run(
                INSERT.into(LEAVE_BALANCE).entries({
                    employee_ID: employeeId,
                    YEAR: year,
                    CASUAL_AVAILABLE: 12,
                    CASUAL_USED: 0,
                    SICK_AVAILABLE: 12,
                    SICK_USED: 0,
                    EARNED_AVAILABLE: 12,
                    EARNED_USED: 0
                })
            );
            balance = await db.run(
                SELECT.one.from(LEAVE_BALANCE)
                    .where({ employee_ID: employeeId, YEAR: year })
            );
        }
        return balance;
    }

    // Helper to calculate weekdays (excluding Saturday & Sunday) — unchanged.
    const getWeekDays = (from, to) => {
        let days = 0;
        let current = new Date(from);
        const end = new Date(to);
        while (current <= end) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) {
                days++;
            }
            current.setDate(current.getDate() + 1);
        }
        return days;
    };

    // Sums reserved (APPROVED / WITHDRAWAL_REQUESTED) weekday-count for a given
    // employee + leave type, counting ONLY leaves whose LEAVE_FROM falls in the
    // given year. Without this year scoping, a LEAVE_BALANCE row correctly
    // resets its AVAILABLE quota to 12 each new year, but USED would still
    // include leaves from prior years since LEAVE_CALENDAR itself is never
    // year-filtered — so this keeps both sides of the balance in sync.
    async function getUsedDaysForYear(employeeId, leaveType, year) {
        const rows = await db.run(
            SELECT.from(LEAVE_CALENDAR)
                .columns("LEAVE_FROM", "LEAVE_TO", "STATUS")
                .where({
                    employee_ID: employeeId,
                    LEAVE_TYPE: leaveType
                })
        );
        let usedDays = 0;
        for (const leave of rows) {
            const leaveYear = new Date(leave.LEAVE_FROM).getFullYear();
            if (leaveYear === year && RESERVED_STATUSES.includes(leave.STATUS)) {
                usedDays += getWeekDays(leave.LEAVE_FROM, leave.LEAVE_TO);
            }
        }
        return usedDays;
    }

    this.on('READ', 'MyProfile', async req => {
        console.log("User =", req.user);
        const email = req.user.id;  //req.user.id; 
        console.log("Email =", email);
        return await db.run(
            SELECT.one
                .from(EMPLOYEES)
                .where({ EMAIL: email })
        );
    });

    this.on('READ', 'MySkills', async req => {
        const employee = await getCurrentEmployee(req);

        if (!employee) { return []; }
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
    // Read My Leaves with working days calculation
    this.on("READ", "MyLeaves", async (req) => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return [];
        }
        // Add employee restriction while preserving OData query options
        req.query.where({ employee_ID: employee.ID });
        const leaves = await db.run(req.query);
        leaves.forEach(leave => {
            const from = new Date(leave.LEAVE_FROM);
            const to = new Date(leave.LEAVE_TO);
            let workingDays = 0;
            const current = new Date(from);
            while (current <= to) {
                const day = current.getDay();
                if (day !== 0 && day !== 6) {
                    workingDays++;
                }
                current.setDate(current.getDate() + 1);
            }
            leave.DAYS = workingDays;
        });
        return leaves;
    });

    // Read My Leave Balance (available/used per leave type, for the current year)
    this.on("READ", "MyLeaveBalance", async (req) => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return [];
        }
        const year = new Date().getFullYear();
        const balance = await getOrCreateLeaveBalance(employee.ID, year);

        // USED is always recomputed live from reserved-status leaves within
        // THIS year, same as the rest of this service does, rather than
        // trusting a stored counter that could drift out of sync with
        // LEAVE_CALENDAR — and rather than accidentally counting leaves from
        // a prior year against this year's freshly-reset quota.
        for (const [leaveType, availableField] of Object.entries(LEAVE_TYPE_AVAILABLE_FIELD)) {
            const usedField = availableField.replace('_AVAILABLE', '_USED');
            balance[usedField] = await getUsedDaysForYear(employee.ID, leaveType, year);
        }

        // OData V4 entity-set reads expect a collection back, not a bare object.
        return [balance];
    });

    // Apply Leave Action
    this.on('ApplyLeave', async req => {
        const db = await cds.connect.to('db');
        const employee = await getCurrentEmployee(req);
        // Validate dates
        if (req.data.leaveFrom > req.data.leaveTo) {
            return req.reject(
                400,
                "Leave From date cannot be greater than Leave To date."
            );
        }

        // Calculate requested leave days
        const requestedDays = getWeekDays(
            req.data.leaveFrom,
            req.data.leaveTo
        );

        // Determine the quota field (if any) for this leave type.
        // CASUAL / SICK / EARNED are checked against LEAVE_BALANCE;
        // MATERNITY / PATERNITY / UNPAID are left unlimited.
        const availableField = LEAVE_TYPE_AVAILABLE_FIELD[req.data.leaveType];

        if (availableField) {
            const requestYear = new Date(req.data.leaveFrom).getFullYear();
            const balance = await getOrCreateLeaveBalance(employee.ID, requestYear);

            // Only leaves within the SAME YEAR as the request count against
            // that year's 12-day quota — matches how LEAVE_BALANCE itself
            // resets per YEAR.
            const usedDays = await getUsedDaysForYear(
                employee.ID,
                req.data.leaveType,
                requestYear
            );

            const availableDays = balance[availableField] - usedDays;

            // Check leave balance
            if (requestedDays > availableDays) {
                return req.reject(
                    400,
                    `You don't have enough ${req.data.leaveType} leave balance. You have only ${availableDays} day(s) remaining, but you requested ${requestedDays} day(s).`
                );
            }
        }

        // Check overlapping leave (unchanged — still checked across ALL leave types)
        const existingLeave = await db.run(
            SELECT.one
                .from(LEAVE_CALENDAR)
                .where({ employee_ID: employee.ID })
                .where`
                LEAVE_FROM <= ${req.data.leaveTo}
                AND LEAVE_TO >= ${req.data.leaveFrom}
                AND STATUS NOT IN ('WITHDRAWN', 'REJECTED', 'CANCELLED')
            `
        );
        if (existingLeave) {
            return req.reject(
                400,
                `A leave already exists from ${existingLeave.LEAVE_FROM} to ${existingLeave.LEAVE_TO}.`
            );
        }
        // Generate Leave ID
        const leaveId = await generateBusinessId(
            req,
            "LEAVE_SEQ",
            "LEV"
        );
        // Insert leave request
        await db.run(
            INSERT.into(LEAVE_CALENDAR).entries({
                LEAVE_ID: leaveId,
                employee_ID: employee.ID,
                LEAVE_TYPE: req.data.leaveType,
                LEAVE_FROM: req.data.leaveFrom,
                LEAVE_TO: req.data.leaveTo,
                REASON: req.data.reason,
                STATUS: "PENDING"
            })
        );

        return {
            message: "Leave request submitted successfully"
        };
    });
    // Calculate total allocation percentage for MyProfile
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
        }
    });

    this.before('CREATE', LEAVE_CALENDAR, async (req) => {
        req.data.LEAVE_ID = await generateBusinessId(req, 'LEAVE_SEQ', 'LEV');
    });
    // Cancel Leave Action
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
    // Withdraw Leave Action — no longer withdraws instantly. Instead this
    // submits a withdrawal request that an admin must approve, mirroring how
    // ApplyLeave itself needs admin approval. The leave's days stay reserved
    // (see RESERVED_STATUSES) until the admin acts on the request.
    this.on('WithdrawLeave', async (req) => {
        const db = await cds.connect.to('db');

        const oLeave = await db.run(
            SELECT.one.from(LEAVE_CALENDAR).where({ ID: req.data.leaveId })
        );
        if (!oLeave) {
            return req.reject(404, `Leave request not found`);
        }
        if (oLeave.STATUS === 'WITHDRAW_REQUEST') {
            return req.reject(400, 'A withdrawal request for this leave is already pending admin approval.');
        }
        if (oLeave.STATUS !== 'APPROVED') {
            return req.reject(400, 'Only approved leave requests can be withdrawn.');
        }

        await db.run(UPDATE(LEAVE_CALENDAR)
            .set({
                STATUS: "WITHDRAW_REQUEST"
            })
            .where({
                ID: req.data.leaveId
            })
        );

        return {
            message: "Withdrawal request submitted. It will take effect once approved by an admin."
        };
    });
});