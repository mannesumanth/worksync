sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.Home", {

        onInit: function () {
            this._redirectByRole();
        },

        _redirectByRole: async function () {
            const oRouter = this.getOwnerComponent().getRouter();
            try {
                const oUser = await this._fetchCurrentUser();
                const aScopes = (oUser && oUser.scopes) || [];
                
                const bIsAdmin = aScopes.some((s) => /\.Admin$/.test(s));
                const bIsEmployee = aScopes.some((s) => /\.Employee$/.test(s));

                if (bIsAdmin) {
                    oRouter.navTo("Admin");
                } else if (bIsEmployee) {
                    oRouter.navTo("Employee");
                } else {
                    oRouter.navTo("Admin");
                }
            } catch (oError) {
                oRouter.navTo("Admin");
            }
        },

        _fetchCurrentUser: async function () {
            const response = await fetch("/user-api/currentUser");
            if (!response.ok) {
                throw new Error(
                    "/user-api/currentUser returned " + response.status
                );
            }
            return response.json();
        }
    });

});