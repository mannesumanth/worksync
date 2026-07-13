const cds = require('@sap/cds');
const { generateBusinessId } = require("../utils/id-generator");

module.exports = {
    register(service) {
        const {
            PROJECTS,
            PROJECT_REQUIREMENTS,
            DESIGNATIONS,
            SKILL_CATEGORIES,
            SKILLS
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

    }
}