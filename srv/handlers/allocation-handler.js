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
        // Validate Allocation Percentage before creating a new allocation
        service.before('CREATE', ALLOCATIONS, async (req) => {
            // Extract relevant data from the request
            const { employee_ID, ALLOCATION_PERCENTAGE, START_DATE, END_DATE } = req.data;
            // If either employee_ID or ALLOCATION_PERCENTAGE is missing, skip validation
            if (!employee_ID || !ALLOCATION_PERCENTAGE) return;
            // Fetch existing allocations for the employee
            const aAllocations = await cds.run(SELECT.from(ALLOCATIONS)
                .columns('ALLOCATION_PERCENTAGE')
                .where({ employee_ID })
            );
            // Calculate the current total allocation percentage for the employee
            const currentTotal = aAllocations.reduce(
                (sum, item) => sum + Number(item.ALLOCATION_PERCENTAGE || 0),
                0
            );
            // Calculate the new total allocation percentage after adding the new allocation
            const newTotal = currentTotal + Number(ALLOCATION_PERCENTAGE);
            // If the new total exceeds 100%, reject the request with an error message
            if (newTotal > 100) {
                req.reject(
                    400,
                    `Allocation exceeds 100%. Current allocation is ${currentTotal}%. New total would be ${newTotal}%.`
                );
            }
        });
        // Validate Allocation Percentage before updating an existing allocation
        service.before("UPDATE", ALLOCATIONS, async (req) => {
            // Extract the allocation ID from the request parameters
            const allocationId = req.params[0].ID;
            // Fetch the existing allocation record from the database
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
            // Extract the employee ID and the new allocation percentage from the request
            const employeeId = existing.employee_ID;
            const newAllocation = Number(
                req.data.ALLOCATION_PERCENTAGE ?? existing.ALLOCATION_PERCENTAGE
            );
            // Fetch all allocations for the employee to calculate the total allocation percentage
            const allocations = await cds.run(SELECT
                .from(ALLOCATIONS)
                .columns(
                    "ID",
                    "ALLOCATION_PERCENTAGE"
                )
                .where({ employee_ID: employeeId }));
                // Calculate the total allocation percentage for the employee, considering the new allocation percentage
            let total = 0;
            for (const allocation of allocations) {
                if (allocation.ID === allocationId) {
                    total += newAllocation;
                } else {
                    total += Number(allocation.ALLOCATION_PERCENTAGE);
                }
            }
            // If the total allocation percentage exceeds 100%, reject the request with an error message
            if (total > 100) {
                req.reject(
                    400,
                    `Allocation exceeds 100%. Total would become ${total}%.`
                );
            }

        });
    }
}
