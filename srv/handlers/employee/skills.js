const cds = require("@sap/cds");

const { EMPLOYEE_SKILLS, SKILLS } = cds.entities("worksync.db");
const { getCurrentEmployee } = require("../../utils/employee");

module.exports = function (service) {
    // Read current employee skills
    service.on("READ", "MySkills", async (req) => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return req.reject(404, "Employee not found.");
        }
        const db = await cds.connect.to("db");
        const skills = await db.run(
            SELECT.from(EMPLOYEE_SKILLS)
                .where({
                    employee_ID: employee.ID
                })
        );
        for (const skill of skills) {
            const skillData = await db.run(
                SELECT.one
                    .from(SKILLS)
                    .where({
                        ID: skill.skill_ID
                    })
            );
            skill.SKILL_NAME = skillData?.SKILL_NAME;
        }
        return skills;
    });
};