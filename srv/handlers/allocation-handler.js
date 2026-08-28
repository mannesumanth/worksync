const cds = require("@sap/cds");
const { generateBusinessId } = require("../utils/id-generator");

module.exports = {
    register(service) {
        const {
            ALLOCATIONS,
            PROJECTS,
            EMPLOYEES,
            AllocationHistory
        } = service.entities;

        // Generate Allocation ID
        service.before('CREATE', ALLOCATIONS, async (req) => {
            req.data.ALLOCATION_ID = await generateBusinessId(req, 'ALLOCATION_SEQ', 'ALO');
        });

        // Generate Allocation History ID
        service.before('CREATE', AllocationHistory, async (req) => {
            req.data.ALLOC_HISTORY_ID = await generateBusinessId(req, 'ALCHISTORY_SEQ', 'ALH');
        });

        // Validate Allocation Percentage before creating a new allocation
        service.before('CREATE', ALLOCATIONS, async (req) => {
            const { employee_ID, ALLOCATION_PERCENTAGE, START_DATE, END_DATE } = req.data;
            if (!employee_ID || !ALLOCATION_PERCENTAGE) return;

            const aAllocations = await cds.run(SELECT.from(ALLOCATIONS)
                .columns('ALLOCATION_PERCENTAGE')
                .where({ employee_ID })
            );
            const currentTotal = aAllocations.reduce(
                (sum, item) => sum + Number(item.ALLOCATION_PERCENTAGE || 0),
                0
            );
            const newTotal = currentTotal + Number(ALLOCATION_PERCENTAGE);
            if (newTotal > 100) {
                req.reject(
                    400,
                    `Allocation exceeds 100%. Current allocation is ${currentTotal}%. New total would be ${newTotal}%.`
                );
            }
        });

        // Allocation History
        service.after("CREATE", ALLOCATIONS, async (allocation, req) => {
            await req.tx.run(
                INSERT.into(AllocationHistory).entries({
                    employee_ID: allocation.employee_ID,
                    project_ID: allocation.project_ID,
                    ALLOCATION_PERCENTAGE: allocation.ALLOCATION_PERCENTAGE,
                    PROJECT_ROLE: allocation.PROJECT_ROLE,
                    START_DATE: allocation.START_DATE,
                    END_DATE: allocation.END_DATE
                })
            );
        });

        // Validate Allocation Percentage before updating an existing allocation
        service.before("UPDATE", ALLOCATIONS, async (req) => {
            const allocationId = req.params[0].ID;
            const existing = await cds.run(SELECT.one
                .from(ALLOCATIONS)
                .columns("ID", "employee_ID", "ALLOCATION_PERCENTAGE")
                .where({ ID: allocationId }));
            if (!existing) {
                return;
            }
            const employeeId = existing.employee_ID;
            const newAllocation = Number(
                req.data.ALLOCATION_PERCENTAGE ?? existing.ALLOCATION_PERCENTAGE
            );
            const allocations = await cds.run(SELECT
                .from(ALLOCATIONS)
                .columns("ID", "ALLOCATION_PERCENTAGE")
                .where({ employee_ID: employeeId }));
            let total = 0;
            for (const allocation of allocations) {
                if (allocation.ID === allocationId) {
                    total += newAllocation;
                } else {
                    total += Number(allocation.ALLOCATION_PERCENTAGE);
                }
            }
            if (total > 100) {
                req.reject(
                    400,
                    `Allocation exceeds 100%. Total would become ${total}%.`
                );
            }
        });
        service.after("UPDATE", ALLOCATIONS, async (allocation, req) => {
            // req.data only contains the changed fields; fetch the full current row
            const allocationId = req.params[0].ID;
            const oCurrent = await req.tx.run(
                SELECT.one.from(ALLOCATIONS).where({ ID: allocationId })
            );
            if (!oCurrent) {
                return;
            }

            await req.tx.run(
                INSERT.into(AllocationHistory).entries({
                    employee_ID: oCurrent.employee_ID,
                    project_ID: oCurrent.project_ID,
                    ALLOCATION_PERCENTAGE: oCurrent.ALLOCATION_PERCENTAGE,
                    PROJECT_ROLE: oCurrent.PROJECT_ROLE,
                    START_DATE: oCurrent.START_DATE,
                    END_DATE: oCurrent.END_DATE
                })
            );
        });

        // Project-scoped Allocation History
        service.on("GetProjectAllocationHistory", async (req) => {
            const { projectId } = req.data;

            const aHistory = await cds.run(
                SELECT.from(AllocationHistory)
                    .where({ project_ID: projectId })
                    .columns(h => {
                        h.ID,
                            h.ALLOC_HISTORY_ID,
                            h.ALLOCATION_PERCENTAGE,
                            h.PROJECT_ROLE,
                            h.START_DATE,
                            h.END_DATE,
                            h.employee(e => { e.EMP_ID, e.NAME }),
                            h.project(p => { p.PROJECT_ID, p.PROJECT_NAME })
                    })
                    .orderBy("ALLOC_HISTORY_ID desc")
            );

            return aHistory.map(h => ({
                ID: h.ID,
                ALLOC_HISTORY_ID: h.ALLOC_HISTORY_ID,
                EMP_ID: h.employee?.EMP_ID,
                EMPLOYEE_NAME: h.employee?.NAME,
                PROJECT_ID: h.project?.PROJECT_ID,
                PROJECT_NAME: h.project?.PROJECT_NAME,
                ALLOCATION_PERCENTAGE: h.ALLOCATION_PERCENTAGE,
                PROJECT_ROLE: h.PROJECT_ROLE,
                START_DATE: h.START_DATE,
                END_DATE: h.END_DATE
            }));
        });
    }
};