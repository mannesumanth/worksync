const cds = require("@sap/cds");

const { EMPLOYEES } = cds.entities("worksync.db");

async function getCurrentEmployee(req) {
    const db = await cds.connect.to("db");

    const userId = req.user?.id;

    console.log("Logged User:", userId);

    if (!userId || userId === "anonymous") {
        return null;
    }

    const employee = await db.run(
        SELECT.one
            .from(EMPLOYEES)
            .where({
                EMAIL: userId
            })
    );

    console.log("Employee:", employee);

    return employee;
}

module.exports = {
    getCurrentEmployee
};