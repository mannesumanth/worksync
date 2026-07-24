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


        // Designation Dialog
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

        // Close Designation Dialog
        onCloseDesignation: function () { this._oDesignationDialog.close(); },

        // Save Designation
        onSaveDesignation: async function () {
            const oPayload = {
                NAME: this.byId("designationNameInput").getValue(),
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

        // Delete Designation
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
                                            "designation_ID",
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
        },

        // Edit Designation
        onEditDesignation: async function (oEvent) {

            if (!this._oEditDesignationDialog) {
                this._oEditDesignationDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.EditDesignation",
                    controller: this
                });

                this.getView().addDependent(this._oEditDesignationDialog);
            }

            this._oDesignationContext = oEvent.getSource().getBindingContext();

            const oModel = new sap.ui.model.json.JSONModel(
                JSON.parse(JSON.stringify(this._oDesignationContext.getObject()))
            );

            this._oEditDesignationDialog.setModel(oModel, "edit");
            this._oEditDesignationDialog.open();
        },

        // Update Designation
        onUpdateDesignation: async function () {

            const oEditData = this._oEditDesignationDialog
                .getModel("edit")
                .getData();

            // No changes
            if (this._oDesignationContext.getProperty("NAME") === oEditData.NAME) {
                MessageToast.show("No changes to save.");
                this._oEditDesignationDialog.close();
                return;
            }

            this._oDesignationContext.setProperty("NAME", oEditData.NAME);

            await this.getView().getModel().submitBatch("$auto");
            sap.ui.getCore().getEventBus().publish(
                        "Employees",
                        "Refresh"
                    );

            MessageToast.show("Designation updated successfully.");

            this._oEditDesignationDialog.close();
        },
        onCancelDesignation: function () {
            this._oEditDesignationDialog.close();
        }
    });
});