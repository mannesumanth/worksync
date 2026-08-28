const cds = require("@sap/cds");

module.exports = {
    register(service) {
        const { ALLOCATIONS, EMPLOYEES, LEAVE_CALENDAR, } = service.entities;
        service.on('GetAvailabilityForecast', async () => {
            // Fetch all active employees
            const activeEmployees = await cds.run(
                SELECT.from(EMPLOYEES)
                    .where({ STATUS: 'ACTIVE' })
            );
            // Calculate the total number of active employees
            const totalEmployees = activeEmployees.length;
            const today = new Date();
            // Calculate the start and end dates for the current and next months
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
            // Create sets to track employees on leave for the current and next months
            const currentMonthEmployees = new Set();
            const nextMonthEmployees = new Set();
            // Iterate through the approved leaves and check if they fall within the current or next month
            approvedLeaves.forEach(leave => {
                const from = new Date(leave.LEAVE_FROM);
                const to = new Date(leave.LEAVE_TO);
                // Check if the leave overlaps with the current month
                if (
                    from <= currentMonthEnd &&
                    to >= currentMonthStart
                ) {
                    currentMonthEmployees.add(leave.employee_ID);
                }
                // Check if the leave overlaps with the next month
                if (
                    from <= nextMonthEnd &&
                    to >= nextMonthStart
                ) {
                    nextMonthEmployees.add(leave.employee_ID);
                }
            });
            // Fetch the count of pending leaves
            const pendingLeaves = await cds.run(
                SELECT.from(LEAVE_CALENDAR)
                    .where({ STATUS: 'PENDING' })
            );
            // Return the availability forecast data
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
        // Fetch resource forecast data
        service.on("GetResourceForecast", async () => {
            const today = new Date();
            // Calculate the start and end dates for the current and next months
            const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
            // Fetch all active employees
            const employees = await cds.run(
                SELECT.from(EMPLOYEES)
                    .columns(
                        "ID",
                        "EMP_ID",
                        "NAME",
                        "designation.NAME as DESIGNATION"
                    )
                    .where({
                        STATUS: "ACTIVE"
                    })
            );
            // If there are no active employees, return an empty array
            if (!employees.length) {
                return [];
            }
            // Extract employee IDs for further queries
            const employeeIds = employees.map(e => e.ID);
            //  Fetch allocations and leaves for the active employees
            const allocations = await cds.run(
                SELECT.from(ALLOCATIONS)
                    .columns(
                        "employee_ID",
                        "project_ID",
                        "project.PROJECT_NAME as PROJECT_NAME",
                        "ALLOCATION_PERCENTAGE",
                        "START_DATE",
                        "END_DATE"
                    )
            );
            // Fetch leaves for the active employees
            const leaves = await cds.run(
                SELECT.from(LEAVE_CALENDAR)
                    .columns(
                        "employee_ID",
                        "LEAVE_FROM",
                        "LEAVE_TO"
                    )
                    .where({
                        STATUS: "APPROVED",
                        employee_ID: { in: employeeIds }
                    })
            );
            // Create a map to store allocation data for each employee
            const allocationMap = new Map();
            // Iterate through the allocations and populate the allocation map
            allocations.forEach(a => {
                if (!allocationMap.has(a.employee_ID)) {
                    allocationMap.set(a.employee_ID, {
                        allocation: 0,
                        allocationEnd: null,
                        currentProjects: 0,
                        nextProjects: 0,
                        currentProjectName: null
                    });
                }
                // Update the allocation data for the employee
                const obj = allocationMap.get(a.employee_ID);
                // Sum the allocation percentages for the employee
                obj.allocation += Number(a.ALLOCATION_PERCENTAGE);
                if (
                    !obj.allocationEnd ||
                    new Date(a.END_DATE) > new Date(obj.allocationEnd)) {
                    obj.allocationEnd = a.END_DATE;
                }

                const start = new Date(a.START_DATE);
                const end = new Date(a.END_DATE);
                // Check if the allocation overlaps with the current month
                if (
                    start <= currentMonthEnd &&
                    end >= currentMonthStart
                ) {
                    obj.currentProjects++;
                    if (!obj.currentProjectName) {
                        obj.currentProjectName = a.PROJECT_NAME;
                    }
                }
                // Check if the allocation overlaps with the next month
                if (
                    start <= nextMonthEnd &&
                    end >= nextMonthStart
                ) {
                    obj.nextProjects++;
                }
            });
            // Create a map to store leave data for each employee
            const leaveMap = new Map();
            leaves.forEach(l => {
                leaveMap.set(l.employee_ID, l);
            });
            // Prepare the final result array with detailed information for each employee
            const result = [];
            // Iterate through each employee and calculate their availability and status
            employees.forEach(emp => {
                // Retrieve allocation and leave data for the employee
                const alloc = allocationMap.get(emp.ID);
                const leave = leaveMap.get(emp.ID);
                // Extract allocation and leave details, providing default values if not available
                const allocation = alloc?.allocation || 0;
                const allocationEnd = alloc?.allocationEnd || null;
                // Calculate the available percentage based on allocation
                const availablePercent =
                    Math.max(0, 100 - allocation);
                // Calculate the current and next project counts and names
                const currentProjectCount =
                    alloc?.currentProjects || 0;
                const nextProjectCount =
                    alloc?.nextProjects || 0;
                const currentProjectName =
                    alloc?.currentProjectName || "";
                // Determine the next available date based on allocation end and leave end dates
                let nextAvailableDate = null;
                if (allocationEnd) {
                    nextAvailableDate = allocationEnd;
                }
                // If the employee has leave, check if it extends beyond the next available date
                if (
                    leave?.LEAVE_TO &&
                    (
                        !nextAvailableDate ||
                        new Date(leave.LEAVE_TO) >
                        new Date(nextAvailableDate)
                    )
                ) {
                    nextAvailableDate = leave.LEAVE_TO;
                }
                // Determine if the employee is on leave in the current or next month
                let currentOnLeave = false;
                let nextOnLeave = false;
                if (leave) {
                    const from = new Date(leave.LEAVE_FROM);
                    const to = new Date(leave.LEAVE_TO);
                    // Check if the employee is on leave in the current month
                    currentOnLeave =
                        from <= currentMonthEnd &&
                        to >= currentMonthStart;
                    // Check if the employee is on leave in the next month
                    nextOnLeave =
                        from <= nextMonthEnd &&
                        to >= nextMonthStart;
                }
                // Determine the current and next status of the employee based on allocation and leave
                let currentStatus;
                if (currentOnLeave) {
                    currentStatus = "On Leave";
                } else if (allocation === 0) {
                    currentStatus = "Bench";
                } else if (allocation < 100) {
                    currentStatus = "Available";
                } else {
                    currentStatus = "Fully Allocated";
                }
                // Determine the next status of the employee based on allocation and leave
                let nextStatus;
                if (nextOnLeave) {
                    nextStatus = "On Leave";
                } else if (
                    allocationEnd &&
                    new Date(allocationEnd) <
                    nextMonthStart
                ) {
                    nextStatus = "Available";
                } else if (allocation === 0) {
                    nextStatus = "Bench";
                } else if (allocation < 100) {
                    nextStatus = "Available";
                } else {
                    nextStatus = "Fully Allocated";
                }
                // Push the employee's data into the result array
                result.push({
                    ID: emp.ID,
                    EMP_ID: emp.EMP_ID,
                    NAME: emp.NAME,
                    DESIGNATION: emp.DESIGNATION,
                    CURRENT_ALLOCATION: allocation,
                    AVAILABLE_PERCENT: availablePercent,
                    CURRENT_PROJECT_COUNT: currentProjectCount,
                    NEXT_PROJECT_COUNT: nextProjectCount,
                    CURRENT_PROJECT_NAME: currentProjectName,
                    CURRENT_STATUS: currentStatus,
                    NEXT_STATUS: nextStatus,
                    // Determine if the employee is currently available based on their status and allocation
                    CURRENT_AVAILABLE:
                        currentStatus !== "On Leave" &&
                        allocation < 100,
                    NEXT_AVAILABLE:
                        nextStatus !== "On Leave" &&
                        nextStatus !== "Fully Allocated",
                    NEXT_AVAILABLE_DATE: nextAvailableDate,
                    LEAVE_END_DATE:
                        leave?.LEAVE_TO || null,
                    ALLOCATION_END_DATE:
                        allocationEnd
                });
            });
            // Sort the result array based on availability and allocation
            result.sort((a, b) => {
                if (
                    a.CURRENT_AVAILABLE &&
                    !b.CURRENT_AVAILABLE
                ) {
                    return -1;
                }
                if (
                    !a.CURRENT_AVAILABLE &&
                    b.CURRENT_AVAILABLE
                ) {
                    return 1;
                }
                return a.CURRENT_ALLOCATION - b.CURRENT_ALLOCATION;
            });
            return result;
        });
        service.on("GetEmployeeForecastDetails", async (req) => {
            const { employeeId } = req.data;
            if (!employeeId) {
                return req.reject(400, "Employee ID is required.");
            }
            const {
                EMPLOYEES,
                ALLOCATIONS,
                LEAVE_CALENDAR
            } = service.entities;
            // EMPLOYEE
            const employee = await cds.run(
                SELECT.one
                    .from(EMPLOYEES)
                    .columns(
                        "ID",
                        "EMP_ID",
                        "NAME",
                        "designation.NAME as DESIGNATION"
                    )
                    .where({
                        ID: employeeId
                    })
            );
            if (!employee) {
                return req.reject(404, "Employee not found.");
            }
            // ALLOCATIONS / PROJECTS
            const allocations = await cds.run(
                SELECT.from(ALLOCATIONS)
                    .columns(
                        "ID",
                        "project_ID",
                        "project.PROJECT_ID as PROJECT_CODE",
                        "project.PROJECT_NAME as PROJECT_NAME",
                        "PROJECT_ROLE",
                        "ALLOCATION_PERCENTAGE",
                        "START_DATE",
                        "END_DATE"
                    )
                    .where({
                        employee_ID: employeeId
                    })
            );
            // APPROVED LEAVES
            const leaves = await cds.run(
                SELECT.from(LEAVE_CALENDAR)
                    .columns(
                        "ID",
                        "LEAVE_TYPE",
                        "LEAVE_FROM",
                        "LEAVE_TO",
                        "STATUS"
                    )
                    .where({
                        employee_ID: employeeId,
                        STATUS: "APPROVED"
                    })
            );
            // CURRENT DATE
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // PROJECT DETAILS
            const projects = allocations
                .map(project => ({
                    ID: project.ID,
                    PROJECT_ID: project.project_ID,
                    PROJECT_NAME: project.PROJECT_NAME,
                    PROJECT_ROLE: project.PROJECT_ROLE,
                    ALLOCATION_PERCENTAGE:
                        Number(project.ALLOCATION_PERCENTAGE || 0),
                    START_DATE: project.START_DATE,
                    END_DATE: project.END_DATE
                }))
                .sort(
                    (a, b) =>
                        new Date(a.END_DATE) -
                        new Date(b.END_DATE)
                );
            // CURRENT ALLOCATION
            const currentAllocation = projects
                .filter(project => {
                    const start = new Date(project.START_DATE);
                    const end = new Date(project.END_DATE);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(0, 0, 0, 0);
                    return start <= today && end >= today;
                })
                .reduce((sum, project) => sum + project.ALLOCATION_PERCENTAGE,0);
            const currentAvailable = Math.max(0, 100 - currentAllocation);
            // AVAILABILITY TIMELINE
            const availabilityTimeline = [];
            projects.forEach(project => {
                const projectEnd = new Date(project.END_DATE);
                projectEnd.setHours(0, 0, 0, 0);
                /*
                 * Find all projects which are still active
                 * after this project ends.
                 */
                const remainingProjects =
                    projects.filter(otherProject => {
                        const otherEnd = new Date(otherProject.END_DATE);
                        otherEnd.setHours(0, 0, 0, 0);
                        return otherEnd > projectEnd;
                    });

                const remainingAllocation =
                    remainingProjects.reduce(
                        (sum, remainingProject) =>
                            sum +
                            remainingProject.ALLOCATION_PERCENTAGE,
                        0
                    );
                const availablePercent =
                    Math.max(
                        0,
                        100 - remainingAllocation
                    );
                availabilityTimeline.push({
                    DATE: project.END_DATE,
                    PROJECT_ID: project.PROJECT_ID,
                    PROJECT_NAME: project.PROJECT_NAME,
                    ENDED_ALLOCATION: project.ALLOCATION_PERCENTAGE,
                    REMAINING_ALLOCATION: remainingAllocation,
                    AVAILABLE_PERCENT: availablePercent,
                    FULLY_AVAILABLE: availablePercent >= 100
                });
            });
            // FULLY AVAILABLE DATE
            let fullyAvailableDate = null;
            if (projects.length > 0) {
                fullyAvailableDate =
                    projects.reduce(
                        (latest, project) => {
                            if (
                                !latest ||
                                new Date(project.END_DATE) >
                                new Date(latest)
                            ) {
                                return project.END_DATE;
                            }

                            return latest;
                        },
                        null
                    );
            }
            // LEAVES
            const employeeLeaves = leaves
                .map(leave => ({
                    ID: leave.ID,
                    LEAVE_TYPE: leave.LEAVE_TYPE,
                    LEAVE_FROM: leave.LEAVE_FROM,
                    LEAVE_TO: leave.LEAVE_TO,
                    STATUS: leave.STATUS
                }))
                .sort(
                    (a, b) =>
                        new Date(a.LEAVE_FROM) -
                        new Date(b.LEAVE_FROM)
                );

            /*
             * If an approved leave finishes after the last project,
             * the employee cannot be considered fully available
             * until that leave ends.
             */
            employeeLeaves.forEach(leave => {

                if (
                    !fullyAvailableDate ||
                    new Date(leave.LEAVE_TO) >
                    new Date(fullyAvailableDate)
                ) {
                    fullyAvailableDate =
                        leave.LEAVE_TO;
                }
            });
            // RESPONSE

            return {
                EMPLOYEE_ID: employee.ID,
                EMP_ID: employee.EMP_ID,
                NAME: employee.NAME,
                DESIGNATION: employee.DESIGNATION,
                CURRENT_ALLOCATION: currentAllocation,
                CURRENT_AVAILABLE: currentAvailable,
                PROJECTS:  projects,
                LEAVES:  employeeLeaves,
                AVAILABILITY_TIMELINE:  availabilityTimeline,
                FULLY_AVAILABLE_DATE: fullyAvailableDate
            };
        });
    }
}