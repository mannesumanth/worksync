const cds = require("@sap/cds");

const {
    EMPLOYEES,
    DESIGNATIONS,
    ALLOCATIONS
} = cds.entities("worksync.db");

const {
    getCurrentEmployee
} = require("../../utils/employee");

module.exports = function (service) {

    //Read current employee profile
    
    service.on("READ", "MyProfile", async (req, next) => {
          
         //MyProfile(<ID>)/PROFILE_PHOTO
        const target = req.target && req.target.elements;
        if (
            req.query?.SELECT?.columns?.some(
                column =>
                    column.ref &&
                    column.ref.includes(
                        "PROFILE_PHOTO"
                    )
            )
        ) {
            return next();
        }
        const employee =await getCurrentEmployee(req);
        if (!employee) {
            return req.reject( 404, "Employee not found." );
        }
        const db = await cds.connect.to("db");
        
         // Fetch designation
         
        if (employee.designation_ID) {
            const designation =
                await db.run(
                    SELECT.one
                        .from(DESIGNATIONS)
                        .where({
                            ID:
                                employee.designation_ID
                        })
                );

            if (designation) {
                employee.designation = {
                    ID: designation.ID,
                    DESIGNATION_ID: designation.DESIGNATION_ID,
                    NAME: designation.NAME
                };
            }
        }
        return employee;
    });
      //Calculate allocation percentage
     
    service.after(
        "READ",
        "MyProfile",
        async (employees) => {
            if (!employees) {
                return;
            }
            if (!Array.isArray(employees)) {
                employees = [employees];
            }
            const db = await cds.connect.to("db");
            for (const employee of employees) {
                const allocations =
                    await db.run(
                        SELECT.from(ALLOCATIONS)
                            .where({
                                employee_ID:
                                    employee.ID
                            })
                    );
                employee.ALLOCATION_PERCENT =
                    allocations.reduce(
                        (total,allocation) =>
                            total + Number( allocation.ALLOCATION_PERCENTAGE || 0 ), 0 );
            }
        }
    );

};