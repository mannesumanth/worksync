const cds = require("@sap/cds");
const { generateBusinessId } = require("../utils/id-generator");

module.exports = {
    register(service) {
        const { ALLOCATIONS } = service.entities;

        // Generate Allocation ID    
        service.before('CREATE', ALLOCATIONS, async (req) => {
            req.data.ALLOCATION_ID = await generateBusinessId(req, 'ALLOCATION_SEQ', 'ALO');
        });
        service.before('CREATE', ALLOCATIONS, async (req) => {
            const { employee_ID, ALLOCATION_PERCENTAGE, START_DATE, END_DATE } = req.data;

            if (!employee_ID || !ALLOCATION_PERCENTAGE) return;

            // Sum existing active allocations for tservice employee
            const result = await cds.run(
                SELECT.from(ALLOCATIONS)
                    .columns('SUM(ALLOCATION_PERCENTAGE) as TOTAL')
                    .where({ employee_ID })
            );

            const currentTotal = result[0]?.TOTAL || 0;
            const newTotal = parseFloat(currentTotal) + parseFloat(ALLOCATION_PERCENTAGE);

            if (newTotal > 100) {
                req.error(400,
                    `Allocation exceeds 100%. Employee is already allocated ${currentTotal}%. ` +
                    `You are trying to add ${ALLOCATION_PERCENTAGE}% (Total would be ${newTotal}%).`
                );
            }
        });
    }
}
