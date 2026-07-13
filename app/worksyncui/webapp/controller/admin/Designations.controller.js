sap.ui.define([ 
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Controller,
    Fragment,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator
) {
    "use strict";
    return Controller.extend("com.amista.worksyncui.controller.admin.Designation", {
        
        onOpenDesignationDialog: async function () {
            if (!this._oDesignationDialog) {
                this._oDesignationDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.AddDesignation",
                    controller: this
                });
                this.getView().addDependent(this._oDesignationDialog);
            }
            this._oDesignationDialog.open();
        },

        onCloseDesignation: function () { this._oDesignationDialog.close(); },

        onSaveDesignation: async function () {
            const oPayload = {
                NAME: this.byId("designationNameInput").getValue(),
                LEVEL: parseInt(this.byId("designationLevelInput").getValue())
            };
            if (!oPayload.NAME) { MessageToast.show("Name is required"); return; }
            try {
                const oCtx = this.getView().getModel().bindList("/DESIGNATIONS").create(oPayload);
                await oCtx.created();
                MessageToast.show("Designation Created");
                this.byId("designationsTable")?.getBinding("items")?.refresh();
                this._oDesignationDialog.close();
            } catch (e) { MessageBox.error(e.message || "Failed"); }
        },
        onDeleteDesignation: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            if (!oContext) { return; }
            const oModel = this.getView().getModel();
            const oDesignation = oContext.getObject();
            MessageBox.confirm(
                "Are you sure you want to delete this designation?",
                {
                    actions: [
                        MessageBox.Action.YES,
                        MessageBox.Action.NO
                    ],
                    emphasizedAction: MessageBox.Action.NO,
                    onClose: async (sAction) => {
                        if (sAction !== MessageBox.Action.YES) {
                            return;
                        }
                        try {
                            // Check if any employee is using this designation
                            const aEmployeeContexts = await oModel
                                .bindList(
                                    "/EMPLOYEES",
                                    null,
                                    null,
                                    [
                                        new Filter(
                                            "DESIGNATION_ID",
                                            FilterOperator.EQ,
                                            oDesignation.ID
                                        )
                                    ]
                                )
                                .requestContexts(0, 1);
                            if (aEmployeeContexts.length > 0) {
                                MessageBox.warning(
                                    "This designation is assigned to one or more employees and cannot be deleted."
                                );
                                return;
                            }
                            await oContext.delete("$auto");
                            MessageToast.show(
                                "Designation deleted successfully."
                            );
                            this.byId("designationsTable").getBinding("items").refresh();
                        } catch (oError) {
                            console.error(oError);
                            MessageBox.error(
                                oError.message || "Unable to delete designation."
                            );
                        }
                    }
                }
            );
        }
    });
});