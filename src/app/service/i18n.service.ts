import { Injectable } from '@angular/core';

// Error and status code translations
var translations = {
  //Angular UI
  "Dismiss": "Dismiss",
  "resetAuthorization not properly initialized": "resetAuthorization not properly initialized",
  "HTTP error: {0} ({1})": "HTTP error: {0} ({1})",
  "Unable to authenticate": "Unable to authenticate",
  "Already logged out": "Already logged out",
  //Server side errors
  "Configuration is undefined": "Configuration is undefined",
  "Bad credentials": "Bad credentials",
  "Cannot create token": "Cannot create token",
  "Password is not set": "Password is not set",
  "Update completed": "Update completed",
  "Cleanup completed": "Cleanup completed",
  "Cannot parse feed": "Cannot parse feed",
  "Cannot delete non-existing token": "Cannot delete non-existing token"
}

//TODO: replace this temporary workaround once https://github.com/angular/angular/issues/11405 is implemented
export class I18nService {
  __(str: string, ...args: string[]): string {
    //TODO: Add some sort of escaping?
    var mappedTranslation = translations[str]
    if(mappedTranslation !== undefined)
      str = mappedTranslation;
    for(var i=0; i < args.length; i++)
      str = str.replace("{" + i + "}", args[i]);
    return str;
  }
}
