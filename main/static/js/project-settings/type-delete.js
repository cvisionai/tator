class TypeDelete {
    constructor({
        type, projectId, typeFormDiv
      }){
        this.type = type;
        this.projectId = projectId;
        this.typeFormDiv = typeFormDiv;
        this.boxHelper = new SettingsBox( this.typeFormDiv );
    }

    init(){
        let deleteBox = this.boxHelper.boxWrapDelete({
            "headingText" : `Delete?`,
            "descriptionText" : "Edit attribute.",
            "level":3,
            "collapsed":true
          });

          return deleteBox;
    }
}