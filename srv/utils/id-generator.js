const cds = require("@sap/cds");

// Generate business ID
async function generateBusinessId(req, sequenceName, prefix) {
    if (!req) {
        throw new Error("Request object is required to generate business ID");
    }
    if (!sequenceName || !prefix) {
        throw new Error("Sequence name and prefix are required");
    }
    const tx = cds.tx(req);
    const result = await tx.run(
        `SELECT "${sequenceName}".NEXTVAL AS SEQ FROM DUMMY`
    );
    const seq = result?.[0]?.SEQ;
    if (!seq) {
        throw new Error(`Failed to read next value from sequence ${sequenceName}`);
    }
    return `${prefix}${String(seq).padStart(4, "0")}`;
}
module.exports = {
    generateBusinessId
};