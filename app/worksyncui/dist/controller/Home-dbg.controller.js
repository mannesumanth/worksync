sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.Home", {

        onInit: function () {

        //     const oModel = this.getOwnerComponent().getModel();
        //         if (oModel._hasRole("Admin")) {
        //             this.getOwnerComponent().getRouter().navTo("Admin");
        //         } else {
        //             this.getOwnerComponent().getRouter().navTo("Employee");
        //         }
        // },

        // _hasRole: function (sRole) {
        //     const aScopes =
        //         sap.ushell &&
        //         sap.ushell.Container &&
        //         sap.ushell.Container.getService("UserInfo")
        //             .getUser()
        //             .getRoles();

        //     return aScopes && aScopes.indexOf(sRole) !== -1;
         this.getOwnerComponent().getRouter().navTo("Admin");
             }

            

    });

});