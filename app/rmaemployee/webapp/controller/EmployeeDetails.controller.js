sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (
    Controller,
    JSONModel,
    MessageBox
) {
    "use strict";

    return Controller.extend(
        "com.amista.rmaemployee.controller.EmployeeDetails",
        {

            onInit: function () {

                // Employee model
                this.getView().setModel(
                    new JSONModel(),
                    "employee"
                );

                // Skills model
                this.getView().setModel(
                    new JSONModel([]),
                    "skills"
                );

                this._loadEmployeeDetails();
                this._loadEmployeeSkills();
            },


            /**
             * Load currently logged-in employee profile
             */
           _loadEmployeeDetails: async function () {

    try {

        const oModel =
            this.getOwnerComponent().getModel();

        const oListBinding =
            oModel.bindList("/MyProfile");

        const aContexts =
            await oListBinding.requestContexts(0, 1);

        if (!aContexts.length) {
            MessageBox.warning(
                "Employee details not found."
            );
            return;
        }

        const oEmployee =
            aContexts[0].getObject();

        this.getView()
            .getModel("employee")
            .setData(oEmployee);

        this._setProfilePhoto(oEmployee);

    } catch (oError) {

        console.error(
            "Error loading employee details:",
            oError
        );

        MessageBox.error(
            "Unable to load employee details."
        );
    }
},


            /**
             * Load skills of currently logged-in employee
             */
            _loadEmployeeSkills: async function () {

                try {

                    const oModel =
                        this.getOwnerComponent().getModel();

                    const oListBinding =
                        oModel.bindList("/MySkills");

                    const aContexts =
                        await oListBinding.requestContexts();

                    const aSkills =
                        aContexts.map(function (oContext) {
                            return oContext.getObject();
                        });

                    this.getView()
                        .getModel("skills")
                        .setData(aSkills);

                } catch (oError) {

                    console.error(
                        "Error loading employee skills:",
                        oError
                    );

                    MessageBox.error(
                        "Unable to load employee skills."
                    );
                }
            },


            /**
             * Set employee profile picture
             */
            _setProfilePhoto: function () {
    this._refreshProfilePhoto();
},
onUploadPhoto: function () {
    const oUploader = this.byId("profilePhotoUploader");

    oUploader.clear();
    oUploader.openFileDialog();
},
onPhotoSelected: async function (oEvent) {

    const oFile =
        oEvent.getParameter("files")?.[0];

    if (!oFile) {
        return;
    }

    const aAllowedTypes = [
        "image/jpeg",
        "image/png"
    ];

    if (!aAllowedTypes.includes(oFile.type)) {
        sap.m.MessageBox.error(
            "Please select a JPG, JPEG, or PNG image."
        );
        return;
    }

    const oEmployee =
        this.getView()
            .getModel("employee")
            .getData();

    if (!oEmployee || !oEmployee.ID) {
        sap.m.MessageBox.error(
            "Employee details are not available."
        );
        return;
    }

    try {

        const sUrl =
            "/odata/v4/employee/MyProfile(" +
            oEmployee.ID +
            ")/PROFILE_PHOTO";

        const oResponse = await fetch(sUrl, {
            method: "PUT",
            headers: {
                "Content-Type": oFile.type
            },
            body: oFile
        });

        if (!oResponse.ok) {

            const sError =
                await oResponse.text();

            console.error(
                "Photo upload failed:",
                sError
            );

            throw new Error(
                "Photo upload failed."
            );
        }

        sap.m.MessageToast.show(
            "Profile photo uploaded successfully."
        );

        this._refreshProfilePhoto();

    } catch (oError) {

        console.error(
            "Error uploading profile photo:",
            oError
        );

        sap.m.MessageBox.error(
            "Unable to upload profile photo."
        );
    }
},
_refreshProfilePhoto: function () {

    const oEmployee =
        this.getView()
            .getModel("employee")
            .getData();

    if (!oEmployee || !oEmployee.ID) {
        return;
    }

    const oImage =
        this.byId("employeeProfilePhoto");

    const oDefaultIcon =
        this.byId("employeeDefaultPhoto");

    const sPhotoUrl =
        "/odata/v4/employee/MyProfile(" +
        oEmployee.ID +
        ")/PROFILE_PHOTO";

    // Add a cache-buster so the browser doesn't
    // continue displaying the old image.
    oImage.setSrc(
        sPhotoUrl + "?_=" + Date.now()
    );

    oImage.setVisible(true);
    oDefaultIcon.setVisible(false);

    oImage.attachError(function () {
        oImage.setVisible(false);
        oDefaultIcon.setVisible(true);
    }, this, {
        once: true
    });
},
}
    );
});