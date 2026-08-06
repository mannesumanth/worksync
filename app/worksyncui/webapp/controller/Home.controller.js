sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.Home", {

        onInit: function () {
            //this._redirectByRole();
        },

        _redirectByRole: async function () {
            const oView = this.getView();
            const oRouter = this.getOwnerComponent().getRouter();

            // Show busy indicator
            oView.setBusy(true);

            try {
                const oUser = await this._fetchCurrentUser();
                console.log(oUser);

                if (oUser.isAdmin) {
                    oRouter.navTo("Home");
                }
                else if (oUser.isEmployee) {
                    oRouter.navTo("Employee");
                }
                else{
                    MessageToast.show("You do not have access to this application.");
                }
            } catch (err) {
                console.error("Failed to fetch user", err);
            } finally {
                // Hide busy indicator
                oView.setBusy(false);
            }
        },

        _fetchCurrentUser: async function () {
            const oModel = this.getOwnerComponent().getModel();
            const oBinding = oModel.bindContext("/currentUser(...)");

            await oBinding.execute();

            return oBinding.getBoundContext().getObject();
        },

        onAdminPress: function () {
            this.getOwnerComponent().getRouter().navTo("Admin");
        },

        onEmployeePress: function () {
            this.getOwnerComponent().getRouter().navTo("Employee");
        }
    });

});