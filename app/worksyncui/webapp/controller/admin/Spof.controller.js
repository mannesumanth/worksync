sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (
    Controller
) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.admin.Spof", {
        onInit: function () {
            this.getView().setModel(new sap.ui.model.json.JSONModel({ risks: [] }), "spof");
            this.onLoadSpofRisks();
            sap.ui.getCore().getEventBus().subscribe(
                "Spof",
                "Refresh",
                this.onLoadSpofRisks,
                this
            );
        },
        refreshSPOF: function () {
            this.onLoadSpofRisks();
        },
        onLoadSpofRisks: async function () {
            const oModel = this.getOwnerComponent().getModel();
            try {
                const oBinding = oModel.bindContext("/DetectSPOF(...)");
                await oBinding.execute();
                const oResult = oBinding.getBoundContext().getObject();
                const aRisks = oResult.value || [];
                const oRiskModel = new sap.ui.model.json.JSONModel({ risks: aRisks });

                this.getView().setModel(oRiskModel, "spof");
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