const cds = require("@sap/cds");

module.exports = {
    register(service) {
        const { EMPLOYEES, SKILLS, EMPLOYEE_SKILLS } = service.entities;
        // SPOF DETECTION: Find skills owned by only one active employee
        service.on('DetectSPOF', async (req) => {
            // Count employees per skill (only ACTIVE employees)
            const activeEmployees = await cds.run(
                SELECT.from(EMPLOYEES).columns('ID').where({ STATUS: 'ACTIVE' })
            );
            // Get the IDs of active employees
            const activeIds = activeEmployees.map(e => e.ID);
            // If there are no active employees, return an empty array
            if (!activeIds.length) return [];
            // Count the number of employees for each skill
            const skillCounts = await cds.run(
                SELECT.from(EMPLOYEE_SKILLS)
                    .columns('skill_ID', 'COUNT(employee_ID) as EMP_COUNT')
                    .where({ employee_ID: { in: activeIds } })
                    .groupBy('skill_ID')
            );
            // Filter skills with only 1 employee
            const spofSkillIds = skillCounts
                .filter(s => parseInt(s.EMP_COUNT) === 1)
                .map(s => s.skill_ID);
            if (!spofSkillIds.length) return [];
            // Get skill details
            const aSkills = await cds.run(
                // Get the details of the skills that are identified as SPOF
                SELECT.from(SKILLS).where({ ID: { in: spofSkillIds } })
            );
            // Get the single employee for each SPOF skill
            const result = [];
            // For each skill, find the associated employee and construct the result
            for (const skill of aSkills) {
                const empSkill = await cds.run(
                    SELECT.one.from(EMPLOYEE_SKILLS)
                        .where({ skill_ID: skill.ID, employee_ID: { in: activeIds } })
                );
                // If an employee is found for the skill, fetch their details
                const emp = empSkill
                    ? await cds.run(SELECT.one.from(EMPLOYEES).where({ ID: empSkill.employee_ID }))
                    : null;
                // Push the skill and employee details into the result array
                result.push({
                    skill_ID: skill.ID,
                    SKILL_NAME: skill.SKILL_NAME,
                    employee_ID: emp?.ID,
                    EMPLOYEE_NAME: emp?.NAME,
                    EMP_ID: emp?.EMP_ID,
                    RISK_LEVEL: 'HIGH'
                });
            }
            return result;
        });
    }
}