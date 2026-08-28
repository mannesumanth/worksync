const cds = require("@sap/cds");

const {
    ALLOCATIONS,
    ALLOCATION_HISTORY,
    PROJECTS,
    EMPLOYEES
} = cds.entities("worksync.db");

const { getCurrentEmployee } = require("../../utils/employee");

module.exports = function (service) {

    // Read projects currently allocated to the logged-in employee
    service.on("READ", "MyProjects", async (req) => {
        const employee = await getCurrentEmployee(req);

        if (!employee) {
            return req.reject(404, "Employee not found.");
        }

        const db = await cds.connect.to("db");
        const allocations = await db.run(
            SELECT.from(ALLOCATIONS).where({
                employee_ID: employee.ID
            })
        );
        // Add project information to each allocation
        for (const allocation of allocations) {
            const project = await db.run(
                SELECT.one.from(PROJECTS).where({
                    ID: allocation.project_ID
                })
            );
            if (project) {
                allocation.PROJECT_ID = project.PROJECT_ID;
                allocation.PROJECT_NAME = project.PROJECT_NAME;
                allocation.DESCRIPTION = project.DESCRIPTION;
                allocation.PROJECT_PRIORITY = project.PRIORITY;
                allocation.PROJECT_STATUS = project.STATUS;
                allocation.PROJECT_START_DATE = project.START_DATE;
                allocation.PROJECT_END_DATE = project.END_DATE;
            }
        }
        return allocations;
    });

    // Read project allocation history of the logged-in employee
    service.on("READ", "AllocationHistory", async (req) => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return req.reject(404, "Employee not found.");
        }
        const db = await cds.connect.to("db");
        const history = await db.run(
            SELECT.from(ALLOCATION_HISTORY).where({
                employee_ID: employee.ID
            })
        );
        // Add project information to each historical allocation
        for (const allocation of history) {
            const project = await db.run(
                SELECT.one.from(PROJECTS).where({
                    ID: allocation.project_ID
                })
            );
            if (project) {
                allocation.PROJECT_ID = project.PROJECT_ID;
                allocation.PROJECT_NAME = project.PROJECT_NAME;
                allocation.PROJECT_STATUS = project.STATUS;
                allocation.PROJECT_PRIORITY = project.PRIORITY;
                allocation.PROJECT_START_DATE = project.START_DATE;
                allocation.PROJECT_END_DATE = project.END_DATE;
            }
        }

        return history;
    });

    // Get details of a project in which the employee is currently allocated
    service.on("GetMyCurrentProjectDetails", async (req) => {
        const { projectId } = req.data;
        const employee = await getCurrentEmployee(req);
        if (!projectId) {
            return req.reject(400, "Project ID is required.");
        }
        if (!employee) {
            return req.reject(404, "Employee not found.");
        }
        const db = await cds.connect.to("db");
        // Get project details
        const project = await db.run(
            SELECT.one.from(PROJECTS).where({
                ID: projectId
            })
        );
        if (!project) {
            return req.reject(404, "Project not found.");
        }
        // Get the logged-in employee's allocation for this project
        const myAllocation = await db.run(
            SELECT.one.from(ALLOCATIONS).where({
                project_ID: projectId,
                employee_ID: employee.ID
            })
        );
        if (!myAllocation) {
            return req.reject(
                403,
                "You are not allocated to this project."
            );
        }
        // Get all employees currently allocated to the project
        const allocations = await db.run(
            SELECT.from(ALLOCATIONS).where({
                project_ID: projectId
            })
        );
        const employeeIds = allocations
            .map(allocation => allocation.employee_ID)
            .filter(Boolean);
        let employees = [];
        if (employeeIds.length) {
            employees = await db.run(
                SELECT.from(EMPLOYEES)
                    .columns("ID", "EMP_ID", "NAME", "EMAIL")
                    .where({
                        ID: { in: employeeIds }
                    })
            );
        }
        // Build the project team details
        const teamMembers = allocations.map(allocation => {
            const teamEmployee = employees.find(
                employee => employee.ID === allocation.employee_ID
            );
            return {
                EMP_ID: teamEmployee?.EMP_ID || "",
                NAME: teamEmployee?.NAME || "",
                EMAIL: teamEmployee?.EMAIL || "",
                PROJECT_ROLE: allocation.PROJECT_ROLE || "",
                ALLOCATION_PERCENTAGE: Number(
                    allocation.ALLOCATION_PERCENTAGE || 0
                ),
                START_DATE: allocation.START_DATE,
                END_DATE: allocation.END_DATE
            };
        });

        // Calculate total allocation for the project
        const totalAllocation = teamMembers.reduce(
            (total, member) =>
                total + Number(member.ALLOCATION_PERCENTAGE || 0),
            0
        );
        return {
            ID: project.ID,
            PROJECT_ID: project.PROJECT_ID,
            PROJECT_NAME: project.PROJECT_NAME,
            DESCRIPTION: project.DESCRIPTION,
            START_DATE: project.START_DATE,
            END_DATE: project.END_DATE,
            STATUS: project.STATUS,
            PRIORITY: project.PRIORITY,

            MY_ROLE: myAllocation.PROJECT_ROLE || "",
            MY_ALLOCATION: Number(  myAllocation.ALLOCATION_PERCENTAGE || 0 ),
            MY_START_DATE: myAllocation.START_DATE,
            MY_END_DATE: myAllocation.END_DATE,

            TEAM_SIZE: teamMembers.length,
            TOTAL_ALLOCATION: totalAllocation,
            TEAM_MEMBERS: teamMembers
        };
    });

    // Get details of a project from the employee's allocation history
    service.on("GetMyProjectHistoryDetails", async (req) => {
        const { projectId } = req.data;
        const employee = await getCurrentEmployee(req);
        if (!projectId) {
            return req.reject(400, "Project ID is required.");
        }
        if (!employee) {
            return req.reject(404, "Employee not found.");
        }
        const db = await cds.connect.to("db");
        // Get project details
        const project = await db.run(
            SELECT.one.from(PROJECTS).where({
                ID: projectId
            })
        );
        if (!project) {
            return req.reject(404, "Project not found.");
        }
        // Get the employee's historical allocation for this project
        const myHistory = await db.run(
            SELECT.one.from(ALLOCATION_HISTORY)
                .where({
                    project_ID: projectId,
                    employee_ID: employee.ID
                })
                .orderBy({
                    END_DATE: "desc"
                })
        );
        if (!myHistory) {
            return req.reject(
                403,
                "No project history found for this employee."
            );
        }
        // Get employees who were part of this project historically
        const historyRecords = await db.run(
            SELECT.from(ALLOCATION_HISTORY).where({
                project_ID: projectId
            })
        );
        const employeeIds = historyRecords
            .map(record => record.employee_ID)
            .filter(Boolean);
        let employees = [];
        if (employeeIds.length) {
            employees = await db.run(
                SELECT.from(EMPLOYEES)
                    .columns("ID", "EMP_ID", "NAME", "EMAIL")
                    .where({
                        ID: { in: employeeIds }
                    })
            );
        }
        // Build the historical project team
        const teamMembers = historyRecords.map(record => {
            const teamEmployee = employees.find(
                employee => employee.ID === record.employee_ID
            );
            return {
                EMP_ID: teamEmployee?.EMP_ID || "",
                NAME: teamEmployee?.NAME || "",
                EMAIL: teamEmployee?.EMAIL || "",
                PROJECT_ROLE: record.PROJECT_ROLE || "",
                ALLOCATION_PERCENTAGE: Number(
                    record.ALLOCATION_PERCENTAGE || 0
                ),
                START_DATE: record.START_DATE,
                END_DATE: record.END_DATE
            };
        });

        // Calculate total historical allocation
        const totalAllocation = teamMembers.reduce(
            (total, member) =>
                total + Number(member.ALLOCATION_PERCENTAGE || 0),
            0
        );
        return {
            ID: project.ID,
            PROJECT_ID: project.PROJECT_ID,
            PROJECT_NAME: project.PROJECT_NAME,
            DESCRIPTION: project.DESCRIPTION,
            START_DATE: project.START_DATE,
            END_DATE: project.END_DATE,
            STATUS: project.STATUS,
            PRIORITY: project.PRIORITY,

            MY_ROLE: myHistory.PROJECT_ROLE || "",
            MY_ALLOCATION: Number(
                myHistory.ALLOCATION_PERCENTAGE || 0
            ),
            MY_START_DATE: myHistory.START_DATE,
            MY_END_DATE: myHistory.END_DATE,

            TEAM_SIZE: teamMembers.length,
            TOTAL_ALLOCATION: totalAllocation,
            TEAM_MEMBERS: teamMembers
        };
    });
};