const cds = require("@sap/cds");
const { generateBusinessId } = require("../utils/id-generator");

module.exports = {
    register(service) {
        const {
            EMPLOYEES,
            EMPLOYEE_SKILLS,
            ALLOCATIONS,
            LEAVE_BALANCE,
            PROJECTS
        } = service.entities;
        // Generate Employee ID
        service.before("CREATE", EMPLOYEES, async (req) => {
            req.data.EMP_ID = await generateBusinessId(
                req,
                "EMPLOYEE_SEQ",
                "EMP"
            );
            console.log("Generated EMP_ID:", req.data.EMP_ID);
        });

        // Create default leave balance
        service.after("CREATE", EMPLOYEES, async (employee) => {
            await cds.run(
                INSERT.into(LEAVE_BALANCE).entries({
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

        // Calculate virtual allocation percentage
        service.after("READ", EMPLOYEES, async (employees) => {
            if (!employees) return;
            const aEmployees = Array.isArray(employees)
                ? employees
                : [employees];
            for (const emp of aEmployees) {
                if (!emp.ID) continue;
                const result = await cds.run(
                    SELECT.from(ALLOCATIONS)
                        .columns("SUM(ALLOCATION_PERCENTAGE) as TOTAL")
                        .where({
                            employee_ID: emp.ID
                        })

                );
                emp.ALLOCATION_PERCENT =
                    parseFloat(result[0]?.TOTAL || 0);
            }
        });

        // Prevent duplicate employee skills
        service.before("CREATE", EMPLOYEE_SKILLS, async (req) => {
            const {
                employee_ID,
                skill_ID
            } = req.data;
            const existing = await cds.run(
                SELECT.one
                    .from(EMPLOYEE_SKILLS)
                    .where({
                        employee_ID,
                        skill_ID
                    })
            );

            if (existing) {
                req.reject(
                    400,
                    "Employee already has this skill."
                );
            }

        });

        // Search Employees
        service.on("SearchEmployees", async (req) => {
            const {
                search,
                status,
                designation,
                minExp,
                maxExp,
                skip = 0,
                top = 20
            } = req.data;
            let query = SELECT.from(EMPLOYEES).columns(
                "*",
                {
                    ref: ["designation"],
                    expand: [{ ref: ["NAME"] }]
                }
            );
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
                query.where({ designation_ID: designation });
            }
            if (minExp != null) {
                query.where({
                    EXPERIENCE: {
                        ">=": minExp
                    }
                });
            }
            if (maxExp != null) {
                query.where({
                    EXPERIENCE: {
                        "<=": maxExp
                    }
                });
            }
            query.limit(top, skip);

            const employees = await cds.run(query);

            for (const emp of employees) {
                if (!emp.ID) continue;

                const result = await cds.run(
                    SELECT.from(ALLOCATIONS)
                        .columns("SUM(ALLOCATION_PERCENTAGE) as TOTAL")
                        .where({
                            employee_ID: emp.ID
                        })
                );

                emp.ALLOCATION_PERCENT = parseFloat(result[0]?.TOTAL || 0);
            }

            return employees;

        });

        // Current User
        service.on("currentUser", req => {
            console.log("========== CURRENT USER ==========")
            console.log("User:", req.user);
            console.log("ID:", req.user.id)
            console.log("Scopes:", req.user.scopes);
            console.log("Attributes:", req.user.attr)
            console.log("Admin?", req.user.is("Admin"));
            console.log("Employee?", req.user.is("Employee"));
            return {
                id: req.user.id,
                scopes: req.user.scopes,
                attr: req.user.attr,
                isAdmin: req.user.is("Admin"),
                isEmployee: req.user.is("Employee")
            };
        });

        service.before("UPDATE", EMPLOYEES, async (req) => {

            // Only execute when STATUS is being updated
            if (!req.data.STATUS) {
                return;
            }

            const statuses = ["RESIGNED", "TERMINATED", "BENCH"];

            if (!statuses.includes(req.data.STATUS)) {
                return;
            }

            const employeeId = req.data.ID;

            // Check if employee manages any projects
            const managedProjects = await cds.run(
                SELECT.from(PROJECTS)
                    .where({
                        manager_ID: employeeId
                    })
            );

            if (managedProjects.length > 0) {
                req.error(
                    400,
                    "Employee is assigned as Project Manager. Please assign another project manager before updating the employee status."
                );
            }

            // Remove all project allocations
            await cds.run(
                DELETE.from(ALLOCATIONS)
                    .where({
                        employee_ID: employeeId
                    })
            );

        });
    }

};