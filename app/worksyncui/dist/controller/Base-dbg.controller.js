sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (
    Controller,
    Fragment,
    MessageToast,
    MessageBox
) {
    "use strict";

    return Controller.extend(
        "com.amista.worksyncui.controller.Base",
        {

            loadFragment: async function (
                sFragmentName,
                sPropertyName
            ) {

                if (!this[sPropertyName]) {
                    this[sPropertyName] =
                        await Fragment.load({
                            id: this.getView().getId(),
                            name: sFragmentName,
                            controller: this
                        });

                    this.getView().addDependent(
                        this[sPropertyName]
                    );
                }
                return this[sPropertyName];
            },

            openDialog: function (sPropertyName) {
                this[sPropertyName]?.open();
            },

            closeDialog: function (sPropertyName) {

                this[sPropertyName]?.close();
            },

            refreshTable: function (sTableId) {

                this.byId(sTableId)
                    ?.getBinding("items")
                    ?.refresh();
            },

           
            showSuccess: function (sMessage) {

                MessageToast.show(sMessage);
            },

            
            showError: function (oError, sDefault) {

                MessageBox.error(
                    oError?.message ||
                    sDefault ||
                    "Unexpected error."
                );
            },

            
            showWarning: function (sMessage) {

                MessageBox.warning(sMessage);
            },

            _editSelected: function (
                sTableId,
                sField
            ) {

                const oTable =
                    this.byId(sTableId);

                const oItem =
                    oTable?.getSelectedItem();

                if (!oItem) {

                    MessageToast.show(
                        "Please select a row."
                    );

                    return;
                }

                const oContext =
                    oItem.getBindingContext();

                MessageBox.prompt(
                    "Edit value",
                    {

                        initialValue:
                            oContext.getProperty(
                                sField
                            ),

                        onClose: async (
                            sAction,
                            sValue
                        ) => {

                            if (
                                sAction ===
                                MessageBox.Action.OK &&
                                sValue
                            ) {

                                try {

                                    await oContext.setProperty(
                                        sField,
                                        sValue
                                    );

                                    await this.getView()
                                        .getModel()
                                        .submitBatch("$auto");

                                    MessageToast.show(
                                        "Updated successfully."
                                    );

                                } catch (oError) {

                                    this.showError(
                                        oError,
                                        "Update failed."
                                    );
                                }
                            }
                        }
                    }
                );
            },

          
            _deleteSelected: function (
                sTableId
            ) {

                const oTable =
                    this.byId(sTableId);

                const oItem =
                    oTable?.getSelectedItem();

                if (!oItem) {

                    MessageToast.show(
                        "Please select a row."
                    );

                    return;
                }

                MessageBox.confirm(
                    "Are you sure you want to delete this record?",
                    {

                        actions: [
                            MessageBox.Action.YES,
                            MessageBox.Action.NO
                        ],

                        emphasizedAction:
                            MessageBox.Action.NO,

                        onClose: async (
                            sAction
                        ) => {

                            if (
                                sAction !==
                                MessageBox.Action.YES
                            ) {
                                return;
                            }

                            try {

                                await oItem
                                    .getBindingContext()
                                    .delete("$auto");

                                MessageToast.show(
                                    "Deleted successfully."
                                );

                            } catch (oError) {

                                this.showError(
                                    oError,
                                    "Delete failed."
                                );
                            }
                        }
                    }
                );
            },

            getMainModel: function () {

                return this.getView().getModel();
            },

            getRouter: function () {

                return this.getOwnerComponent()
                    .getRouter();
            },

            getAppComponent: function () {

                return this.getOwnerComponent();
            }

        }
    );

});