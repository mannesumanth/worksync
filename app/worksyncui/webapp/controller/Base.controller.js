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