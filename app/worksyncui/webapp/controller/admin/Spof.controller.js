sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (
    Controller
) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.admin.Spof", {

        onLoadSpofRisks: async function () {
            const oModel = this.getView().getModel();
            try {
                const oBinding = oModel.bindContext("/DetectSPOF(...)");
                await oBinding.execute();
                const oResult = oBinding.getBoundContext().getObject();
                const aRisks = oResult.value || [];
                const oRiskModel = new sap.ui.model.json.JSONModel({ risks: aRisks });

                this.getView().setModel(oRiskModel, "spof");
                this.byId("tileSpofCount")
                    ?.setValue(aRisks.length);
                const oDashModel = this.getView().getModel("dash");
                const nSkillCount = oDashModel.getProperty("/skillCount") || 0;
                oDashModel.setProperty("/spofCount", aRisks.length);
                oDashModel.setProperty(
                    "/spofPercent",
                    nSkillCount > 0 ? Math.round((aRisks.length / nSkillCount) * 100) : 0
                );
            } catch (oError) {
                console.error("Error loading SPOF risks", oError);
                sap.m.MessageToast.show("Failed to load SPOF Risks");
            }
        },
        riskStateFormatter: function (sRiskLevel) {
            switch (sRiskLevel) {
                case "HIGH":
                    return "Error";
                case "MEDIUM":
                    return "Warning";
                case "LOW":
                    return "Success";
                default:
                    return "None";
            }
        },
    });
});