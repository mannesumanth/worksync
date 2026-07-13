const cds = require("@sap/cds");

module.exports = {
    register(service) {
        const { ALLOCATIONS, EMPLOYEES, LEAVE_CALENDAR,} = service.entities;
        service.on('GetAvailabilityForecast', async () => {

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


        service.on("GetResourceForecast", async () => {
            const today = new Date();
            const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

            const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);

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
            if (!employees.length) {
                return [];
            }
            const employeeIds = employees.map(e => e.ID);

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

            const allocationMap = new Map();

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

                const obj = allocationMap.get(a.employee_ID);

                obj.allocation += Number(a.ALLOCATION_PERCENTAGE);


                if (
                    !obj.allocationEnd ||
                    new Date(a.END_DATE) > new Date(obj.allocationEnd)
                ) {
                    obj.allocationEnd = a.END_DATE;
                }

                const start = new Date(a.START_DATE);
                const end = new Date(a.END_DATE);

                if (
                    start <= currentMonthEnd &&
                    end >= currentMonthStart
                ) {
                    obj.currentProjects++;

                    if (!obj.currentProjectName) {
                        obj.currentProjectName = a.PROJECT_NAME;
                    }
                }

                if (
                    start <= nextMonthEnd &&
                    end >= nextMonthStart
                ) {
                    obj.nextProjects++;
                }

            });
            const leaveMap = new Map();
            leaves.forEach(l => {
                leaveMap.set(l.employee_ID, l);
            });

            const result = [];
            employees.forEach(emp => {
                const alloc = allocationMap.get(emp.ID);
                const leave = leaveMap.get(emp.ID);
                const allocation = alloc?.allocation || 0;
                const allocationEnd = alloc?.allocationEnd || null;
                const availablePercent =
                    Math.max(0, 100 - allocation);

                const currentProjectCount =
                    alloc?.currentProjects || 0;

                const nextProjectCount =
                    alloc?.nextProjects || 0;

                const currentProjectName =
                    alloc?.currentProjectName || "";

                let nextAvailableDate = null;

                if (allocationEnd) {
                    nextAvailableDate = allocationEnd;
                }

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

                let currentOnLeave = false;
                let nextOnLeave = false;
                if (leave) {
                    const from = new Date(leave.LEAVE_FROM);
                    const to = new Date(leave.LEAVE_TO);
                    currentOnLeave =
                        from <= currentMonthEnd &&
                        to >= currentMonthStart;
                    nextOnLeave =
                        from <= nextMonthEnd &&
                        to >= nextMonthStart;
                }
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
    }
}