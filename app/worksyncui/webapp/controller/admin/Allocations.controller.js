sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment"
], function (Controller, Fragment) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.admin.Allocations", {

        onInit: function () {
            sap.ui.getCore().getEventBus().subscribe(
                "Allocations",
                "Refresh",
                this._onAllocationsRefresh,
                this
            );
        },

        _onAllocationsRefresh: function () {
            const oTable = this.byId("allocationsTable");
            if (oTable) {
                oTable.getBinding("items").refresh();
            }
        },

        onExit: function () {
            sap.ui.getCore().getEventBus().unsubscribe(
                "Allocations",
                "Refresh",
                this._onAllocationsRefresh,
                this
            );
        }

    });
});