const cds = require("@sap/cds");

module.exports = {
    register(service) {
        const {
            EMPLOYEES,
            PROJECTS,
            ALLOCATIONS,
            LEAVE_CALENDAR,
            SKILLS,
            DESIGNATIONS
        } = service.entities;
        service.on("GetDashboardStats", async () => {
            const [
                employees,
                projects,
                allocations,
                leaves,
                skills,
                designations
            ] = await Promise.all([
                cds.run( SELECT.from(EMPLOYEES).columns("ID")),
                cds.run( SELECT.from(PROJECTS).columns("STATUS")),
                cds.run( SELECT.from(ALLOCATIONS).columns("employee_ID", "ALLOCATION_PERCENTAGE" )),
                cds.run( SELECT.from(LEAVE_CALENDAR).columns("STATUS")),
                cds.run(SELECT.from(SKILLS).columns("ID")),
                cds.run( SELECT.from(DESIGNATIONS).columns("ID"))

            ]);
            // Employee KPIs
            const totalEmployees = employees.length;
            const employeeAllocation = new Map();
            allocations.forEach(allocation => {
                const current =
                    employeeAllocation.get(allocation.employee_ID) || 0;
                employeeAllocation.set(
                    allocation.employee_ID,
                    current +
                    Number(allocation.ALLOCATION_PERCENTAGE || 0)
                );
            });
            let availableEmployees = 0;
            let benchEmployees = 0;
            let underAllocatedEmployees = 0;
            let fullyAllocatedEmployees = 0;
            let overAllocatedEmployees = 0;
            employees.forEach(employee => {
                const allocation =
                    employeeAllocation.get(employee.ID) || 0;
                if (allocation === 0) { benchEmployees++;}
                if (allocation < 100) {availableEmployees++; }
                if (allocation > 0 && allocation < 100) { underAllocatedEmployees++; }
                if (allocation === 100) { fullyAllocatedEmployees++; }
                if (allocation > 100) {overAllocatedEmployees++;}
            });
            // Project KPIs
            const totalProjects = projects.length;
            const activeProjects = projects.filter( project => project.STATUS === "ACTIVE").length;
            const upcomingProjects = projects.filter(project => project.STATUS === "UPCOMING" ).length;
            const completedProjects = projects.filter(project => project.STATUS === "COMPLETED").length;
            const onHoldProjects =projects.filter(project => project.STATUS === "ON_HOLD").length;

            // Allocation KPIs
            const totalAllocations = allocations.length;
            const totalAllocationPercentage =
                allocations.reduce(
                    (sum, allocation) =>
                        sum +
                        Number(allocation.ALLOCATION_PERCENTAGE || 0),
                    0
                );

            const averageUtilization =
                totalEmployees > 0
                    ? Number(
                        (
                            totalAllocationPercentage /
                            totalEmployees
                        ).toFixed(2)
                    )
                    : 0;
            // Leave KPIs
            const totalLeaves = leaves.length;
            const pendingLeaves = leaves.filter( leave => leave.STATUS === "PENDING").length;
            const approvedLeaves =leaves.filter(leave => leave.STATUS === "APPROVED" ).length;
            const rejectedLeaves =leaves.filter(leave => leave.STATUS === "REJECTED" ).length;

            // Master Data KPIs

            const totalSkills = skills.length;
            const totalDesignations = designations.length;

            return {
                // Employee KPIs
                totalEmployees,
                availableEmployees,
                benchEmployees,
                underAllocatedEmployees,
                fullyAllocatedEmployees,
                overAllocatedEmployees,

                // Project KPIs
                totalProjects,
                activeProjects,
                upcomingProjects,
                completedProjects,
                onHoldProjects,

                // Allocation KPIs
                totalAllocations,
                averageUtilization,

                // Leave KPIs
                totalLeaves,
                pendingLeaves,
                approvedLeaves,
                rejectedLeaves,

                // Master Data KPIs
                totalSkills,
                totalDesignations
            };
        });
    }
};