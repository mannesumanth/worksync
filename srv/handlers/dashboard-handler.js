const cds = require("@sap/cds");

module.exports = {
    register(service) {
        const {
            EMPLOYEES,
            PROJECTS,
            ALLOCATIONS,
            LEAVE_CALENDAR
        } = service.entities;
        service.on("GetDashboardStats", async () => {
            const [
                employees,
                projects,
                allocations,
                leaves
            ] = await Promise.all([
                cds.run( SELECT.from(EMPLOYEES)),
                cds.run(SELECT.from(PROJECTS)),
                cds.run( SELECT.from(ALLOCATIONS)),
                cds.run(SELECT.from(LEAVE_CALENDAR))
            ]);
            const totalEmployees = employees.length;
            const totalProjects = projects.length;
            const totalAllocations = allocations.length;
            const totalLeaves = leaves.length;
            const pendingLeaves = leaves.filter(
                l => l.STATUS === "PENDING"
            ).length;
            const approvedLeaves = leaves.filter(
                l => l.STATUS === "APPROVED"
            ).length;
            const rejectedLeaves = leaves.filter(
                l => l.STATUS === "REJECTED"
            ).length;
            const employeeAllocation = new Map();
            allocations.forEach(a => {
                const current = employeeAllocation.get(a.employee_ID) || 0;
                employeeAllocation.set(a.employee_ID,
                    current + Number(a.ALLOCATION_PERCENTAGE || 0)
                );
            });
            let availableEmployees = 0;
            let benchEmployees = 0;
            employees.forEach(emp => {
                const allocation = employeeAllocation.get(emp.ID) || 0;
                if (allocation === 0) {
                    benchEmployees++;
                }
                if (allocation < 100) {
                    availableEmployees++;
                }
            });
            return {
                totalEmployees,
                availableEmployees,
                benchEmployees,
                totalProjects,
                totalAllocations,
                totalLeaves,
                pendingLeaves,
                approvedLeaves,
                rejectedLeaves
            };
        });
    }
};