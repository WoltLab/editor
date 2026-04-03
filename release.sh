#!/bin/sh
npm run build
cp dist/ckeditor5.umd.js ../WCF/wcfsetup/install/files/js/3rdParty/ckeditor/ckeditor5.bundle.js
cp dist/ckeditor5.css ../WCF/wcfsetup/install/files/style/
#cp dist/translations/*.js ../WCF/wcfsetup/install/files/js/3rdParty/ckeditor/translations/
