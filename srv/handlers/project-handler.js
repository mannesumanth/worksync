const cds = require('@sap/cds');
const { generateBusinessId } = require("../utils/id-generator");

module.exports = {
    register(service) {
        const {
            PROJECTS,
            PROJECT_REQUIREMENTS,
            DESIGNATIONS,
            SKILL_CATEGORIES,
            SKILLS,
            REQUIREMENT_SKILLS,
            ALLOCATIONS
        } = service.entities;

        service.before('CREATE', PROJECTS, async (req) => {
            req.data.PROJECT_ID = await generateBusinessId(req, 'PROJECTS_SEQ', 'PRJ');
        });
        service.before('CREATE', PROJECT_REQUIREMENTS, async (req) => {
            req.data.REQUIREMENT_ID = await generateBusinessId(req, 'REQUIREMENT_SEQ', 'REQ');
            console.log("Generated:", req.data.REQUIREMENT_ID);
        });
        service.before('CREATE', DESIGNATIONS, async (req) => {
            req.data.DESIGNATION_ID = await generateBusinessId(req, 'DESIGNATION_SEQ', 'DES');
            console.log('Generated DESIGNATION_ID:', req.data.DESIGNATION_ID);
        });
        service.before('CREATE', SKILL_CATEGORIES, async (req) => {
            req.data.CAT_ID = await generateBusinessId(req, 'CATEGORY_SEQ', 'CAT');
        });

        service.before('CREATE', SKILLS, async (req) => {
            req.data.SKILL_ID = await generateBusinessId(req, 'SKILL_SEQ', 'SKL');
        });

        service.on("UpdateProject", async (req) => {
            const db = await cds.connect.to("db");
            const tx = db.tx(req);
            const { projectId, project } = req.data;
            // Validate Project
            const oProject = await tx.run(
                SELECT.one
                    .from(PROJECTS)
                    .where({ ID: projectId })
            );

            if (!oProject) {
                req.error(404, "Project not found");
            }
            // Update Project
            await tx.run(
                UPDATE(PROJECTS)
                    .set({
                        PROJECT_NAME: project.PROJECT_NAME,
                        DESCRIPTION: project.DESCRIPTION,
                        START_DATE: project.START_DATE,
                        END_DATE: project.END_DATE,
                        STATUS: project.STATUS,
                        manager_ID: project.manager_ID
                    })
                    .where({
                        ID: projectId
                    })
            );
            if (["COMPLETED", "ON_HOLD", "UPCOMING"].includes(project.STATUS)) {

                await tx.run(
                    DELETE.from(ALLOCATIONS)
                        .where({
                            project_ID: projectId
                        })
                );

            }
            // Get Requirement
            const oRequirement = await tx.run(
                SELECT.one
                    .from(PROJECT_REQUIREMENTS)
                    .where({
                        project_ID: projectId
                    })
            );
            if (!oRequirement) {
                return {
                    message: "Project updated successfully."
                };
            }

            // Existing Requirement Skills
            const aExistingSkills = await tx.run(
                SELECT
                    .from(REQUIREMENT_SKILLS)
                    .where({
                        requirement_ID: oRequirement.ID
                    })
            );
            // UPDATE / CREATE
            for (const oSkill of project.skills) {
                if (oSkill.ID) {
                    await tx.run(
                        UPDATE(REQUIREMENT_SKILLS)
                            .set({
                                skill_ID: oSkill.skill_ID,
                                REQUIRED_LEVEL: oSkill.REQUIRED_LEVEL,
                                REQUIRED_RESOURCES: oSkill.REQUIRED_RESOURCES
                            })
                            .where({
                                ID: oSkill.ID
                            })
                    );
                } else {
                    await tx.run(
                        INSERT.into(REQUIREMENT_SKILLS).entries({
                            requirement_ID: oRequirement.ID,
                            skill_ID: oSkill.skill_ID,
                            REQUIRED_LEVEL: oSkill.REQUIRED_LEVEL,
                            REQUIRED_RESOURCES: oSkill.REQUIRED_RESOURCES
                        })
                    );
                }
            }
            // DELETE REMOVED SKILLS
            for (const oExisting of aExistingSkills) {
                const bExists = project.skills.some(function (oSkill) {
                    return oSkill.ID === oExisting.ID;

                });
                if (!bExists) {
                    await tx.run(
                        DELETE.from(REQUIREMENT_SKILLS)
                            .where({
                                ID: oExisting.ID
                            })
                    );
                }
            }
            return {
                message: "Project updated successfully."
            };

        });
        
    }
}