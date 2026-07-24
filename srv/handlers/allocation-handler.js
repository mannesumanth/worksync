const cds = require("@sap/cds");
const { generateBusinessId } = require("../utils/id-generator");

module.exports = {
    register(service) {
        const { ALLOCATIONS, PROJECTS, EMPLOYEES

        } = service.entities;

        // Generate Allocation ID    
        service.before('CREATE', ALLOCATIONS, async (req) => {
            req.data.ALLOCATION_ID = await generateBusinessId(req, 'ALLOCATION_SEQ', 'ALO');
        });
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

        service.before("UPDATE", ALLOCATIONS, async (req) => {

            const allocationId = req.params[0].ID;

            const existing = await cds.run(SELECT.one
                .from(ALLOCATIONS)
                .columns(
                    "ID",
                    "employee_ID",
                    "ALLOCATION_PERCENTAGE"
                )
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
                .columns(
                    "ID",
                    "ALLOCATION_PERCENTAGE"
                )
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
    }
}
