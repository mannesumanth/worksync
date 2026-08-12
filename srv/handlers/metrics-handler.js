const cds = require("@sap/cds");

module.exports = {

    register: function (srv) {

        const {
            EMPLOYEES,
            ALLOCATIONS,
            PROJECTS,
            EMPLOYEE_SKILLS,
            LEAVE_CALENDAR,
            LEAVE_BALANCE
        } = cds.entities("worksync.db");

        srv.on("GetEmployeeMetrics", async () => {

            const [
                employees,
                allocations,
                projects,
                skills,
                leaveCalendar,
                leaveBalances
            ] = await Promise.all([
                cds.run(
                    SELECT.from(EMPLOYEES)
                        .columns(
                            "ID",
                            "EMP_ID",
                            "NAME",
                            "EMAIL",
                            "STATUS",
                            "EXPERIENCE",
                            "JOINING_DATE",
                            "designation.NAME as DESIGNATION"
                        )
                ),
                cds.run(
                    SELECT.from(ALLOCATIONS)
                        .columns(
                            "employee_ID",
                            "project_ID",
                            "ALLOCATION_PERCENTAGE"
                        )
                ),
                cds.run(
                    SELECT.from(PROJECTS)
                        .columns(
                            "ID",
                            "STATUS"
                        )
                ),
                cds.run(
                    SELECT.from(EMPLOYEE_SKILLS)
                        .columns(
                            "employee_ID",
                            "PROFICIENCY_LEVEL"
                        )
                ),
                cds.run(
                    SELECT.from(LEAVE_CALENDAR)
                        .columns(
                            "employee_ID",
                            "STATUS"
                        )
                ),
                cds.run(
                    SELECT.from(LEAVE_BALANCE)
                )
            ]);
            // Project Lookup
            const projectMap = new Map();
            projects.forEach(project => {
                projectMap.set(project.ID, project);
            });

            // Allocation Lookup
            const allocationMap = new Map();
            allocations.forEach(allocation => {
                const key = allocation.employee_ID;
                if (!allocationMap.has(key)) {
                    allocationMap.set(key, []);
                }
                allocationMap.get(key).push(allocation);
            });
            // Skills Lookup
            const skillMap = new Map();

            skills.forEach(skill => {
                const key = skill.employee_ID;
                if (!skillMap.has(key)) {
                    skillMap.set(key, []);
                }
                skillMap.get(key).push(skill);

            });
            // Leave Lookup

            const leaveMap = new Map();
            leaveCalendar.forEach(leave => {
                const key = leave.employee_ID;
                if (!leaveMap.has(key)) {
                    leaveMap.set(key, []);
                }
                leaveMap.get(key).push(leave);
            });
            // Leave Balance Lookup
            const balanceMap = new Map();
            leaveBalances.forEach(balance => {
                balanceMap.set(balance.employee_ID, balance);
            });
            // Build Result
            const result = [];
            for (const emp of employees) {
                const empAllocations = allocationMap.get(emp.ID) || [];
                const empSkills = skillMap.get(emp.ID) || [];
                const empLeaves = leaveMap.get(emp.ID) || [];
                const balance = balanceMap.get(emp.ID);
                //----------------------------------------
                let totalAllocation = 0;
                let activeProjects = 0;
                let completedProjects = 0;
                empAllocations.forEach(a => {
                    totalAllocation += Number(a.ALLOCATION_PERCENTAGE || 0);
                    const project = projectMap.get(a.project_ID);
                    if (!project) return;
                    if (project.STATUS === "ACTIVE") {
                        activeProjects++;
                    }
                    if (project.STATUS === "COMPLETED") {
                        completedProjects++;
                    }
                });

                let beginner = 0;
                let intermediate = 0;
                let advanced = 0;
                let expert = 0;
                empSkills.forEach(skill => {
                    switch (skill.PROFICIENCY_LEVEL) {
                        case "BEGINNER":
                            beginner++;
                            break;
                        case "INTERMEDIATE":
                            intermediate++;
                            break;
                        case "ADVANCED":
                            advanced++;
                            break;
                        case "EXPERT":
                            expert++;
                            break;
                    }

                });

                let pending = 0;
                let approved = 0;
                let rejected = 0;
                empLeaves.forEach(leave => {
                    switch (leave.STATUS) {
                        case "PENDING":
                            pending++;
                            break;
                        case "APPROVED":
                            approved++;
                            break;
                        case "REJECTED":
                            rejected++;
                            break;
                    }
                });

                result.push({

                    ID: emp.ID,
                    EMP_ID: emp.EMP_ID,
                    NAME: emp.NAME,
                    EMAIL: emp.EMAIL,
                    DESIGNATION: emp.designation?.NAME,
                    STATUS: emp.STATUS,
                    EXPERIENCE: emp.EXPERIENCE,
                    JOINING_DATE: emp.JOINING_DATE,
                    TOTAL_ALLOCATION: totalAllocation,
                    AVAILABLE_PERCENT: Math.max(
                        0,
                        100 - totalAllocation
                    ),
                    PROJECT_COUNT: empAllocations.length,
                    ACTIVE_PROJECT_COUNT: activeProjects,
                    COMPLETED_PROJECT_COUNT: completedProjects,
                    PENDING_LEAVES: pending,
                    APPROVED_LEAVES: approved,
                    REJECTED_LEAVES: rejected,
                    CASUAL_AVAILABLE:
                        balance?.CASUAL_AVAILABLE ?? 0,
                    CASUAL_USED:
                        balance?.CASUAL_USED ?? 0,
                    SICK_AVAILABLE:
                        balance?.SICK_AVAILABLE ?? 0,
                    SICK_USED:
                        balance?.SICK_USED ?? 0,
                    EARNED_AVAILABLE:
                        balance?.EARNED_AVAILABLE ?? 0,
                    EARNED_USED:
                        balance?.EARNED_USED ?? 0,
                    TOTAL_SKILLS: empSkills.length,
                    BEGINNER_SKILLS: beginner,
                    INTERMEDIATE_SKILLS: intermediate,
                    ADVANCED_SKILLS: advanced,
                    EXPERT_SKILLS: expert,
                    CURRENT_UTILIZATION: totalAllocation,
                    IS_AVAILABLE: totalAllocation < 100,
                    IS_OVER_ALLOCATED: totalAllocation > 100
                });
            }
            return result;
        });
    }
};