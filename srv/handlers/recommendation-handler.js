const cds = require("@sap/cds");

module.exports = {
    register(service) {
        const {
            PROJECT_REQUIREMENTS,
            REQUIREMENT_SKILLS,
            EMPLOYEES,
            EMPLOYEE_SKILLS,
            ALLOCATIONS
        } = service.entities;
        // Proficiency ranking
        const proficiencyRank = {
            BEGINNER: 1,
            INTERMEDIATE: 2,
            ADVANCED: 3,
            EXPERT: 4
        };

        service.on('RecommendResources', async (req) => {

            const db = await cds.connect.to('db');

            const { projectId } = req.data;

            console.log("Project ID:", projectId);

            // Get project requirements
            const requirements = await db.run(
                SELECT.from(PROJECT_REQUIREMENTS)
                    .where({ project_ID: projectId })
            );

            console.log("Requirements:", requirements.length);

            if (!requirements.length) {
                return [];
            }

            const requirementIds = requirements.map(r => r.ID);

            const requirementSkills = await db.run(
                SELECT.from(REQUIREMENT_SKILLS)
                    .where({
                        requirement_ID: { in: requirementIds }
                    })
            );
            console.log(
                "Requirement Skills:",
                requirementSkills.length
            );

            if (!requirementSkills.length) {
                return [];
            }

            const employees = await db.run(
                SELECT.from(EMPLOYEES)
                    .where({ STATUS: 'ACTIVE' })
            );

            const recommendations = [];

            for (const emp of employees) {

                const employeeSkills = await db.run(
                    SELECT.from(EMPLOYEE_SKILLS)
                        .where({
                            employee_ID: emp.ID
                        })
                );

                let matchedSkills = 0;

                for (const reqSkill of requirementSkills) {

                    const match = employeeSkills.find(es => {

                        const employeeLevel =
                            proficiencyRank[es.PROFICIENCY_LEVEL];

                        const requiredLevel =
                            proficiencyRank[reqSkill.REQUIRED_LEVEL];
                        return (
                            es.skill_ID === reqSkill.skill_ID &&
                            employeeLevel >= requiredLevel
                        );
                    });

                    if (match) {
                        matchedSkills++;
                    }
                }

                if (matchedSkills > 0) {
                    const today = new Date().toISOString().split("T")[0];
                    const allocations = await db.run(
                        SELECT.from(ALLOCATIONS)
                            .where({
                                employee_ID: emp.ID,
                                START_DATE: { "<=": today },
                                END_DATE: { ">=": today }
                            })
                    );
                    const allocationPercent =
                        allocations.reduce(
                            (sum, a) =>
                                sum + Number(a.ALLOCATION_PERCENTAGE || 0),
                            0
                        );
                    recommendations.push({
                        ID: emp.ID,
                        EMP_ID: emp.EMP_ID,
                        NAME: emp.NAME,
                        EMAIL: emp.EMAIL,

                        MATCHED_SKILLS: matchedSkills,
                        TOTAL_SKILLS: requirementSkills.length,
                        MATCH_PERCENT: Number(
                            (
                                (matchedSkills * 100) /
                                requirementSkills.length
                            ).toFixed(2)
                        ),
                        ALLOCATION_PERCENT: allocationPercent,
                        AVAILABLE_PERCENT:
                            Math.max(0, 100 - allocationPercent)
                    });
                }
            }

            return recommendations.sort(
                (a, b) =>
                    b.MATCH_PERCENT - a.MATCH_PERCENT ||
                    b.AVAILABLE_PERCENT - a.AVAILABLE_PERCENT
            );
        });
    }
};