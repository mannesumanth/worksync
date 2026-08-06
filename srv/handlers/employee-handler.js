const cds = require("@sap/cds");
const { generateBusinessId } = require("../utils/id-generator");

module.exports = {
    register(service) {
        const {
            EMPLOYEES,
            EMPLOYEE_SKILLS,
            ALLOCATIONS,
            LEAVE_BALANCE,
            PROJECTS,
            SKILLS,
            REQUIREMENT_SKILLS
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

        // Delete skill
        service.before("DELETE", SKILLS, async (req) => {
        const skillId = req.data.ID;
        const employeeSkill = await cds.run(
            SELECT.one
                .from(EMPLOYEE_SKILLS)
                .where({ skill_ID: skillId })
        );
        if (employeeSkill) {
            return req.reject(
                400,
                "This skill is assigned to one or more employees and cannot be deleted."
            );
        }
        const projectSkill = await cds.run(
            SELECT.one
                .from(REQUIREMENT_SKILLS)
                .where({ skill_ID: skillId })
        );
        if (projectSkill) {
            return req.reject(
                400,
                "This skill is assigned to one or more projects and cannot be deleted."
            );
        }
    });

    // Search Employees
    service.on("SearchEmployees", async (req) => {
        // Extract search parameters from the request data
        const { search, status, designation, minExp, maxExp, skip = 0, top = 20 } = req.data;
        // Build the base query to select employees with optional filters
        let query = SELECT.from(EMPLOYEES).columns(
            "*",
            {
                ref: ["designation"],
                expand: [{ ref: ["NAME"] }]
            }
        );
        // Apply search filters based on the provided parameters
        if (search) {
            const pattern = `%${search.toLowerCase()}%`;
            // Use a template literal to construct the WHERE clause for the search query
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
        // Execute the query to fetch employees based on the constructed filters
        const employees = await cds.run(query);
        // Calculate the allocation percentage for each employee
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
        if (!req.data.STATUS) { return;}
        const statuses = ["RESIGNED", "TERMINATED","BENCH"];
        if (!statuses.includes(req.data.STATUS)) {
            return;
        }
        const employeeId = req.data.ID;
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