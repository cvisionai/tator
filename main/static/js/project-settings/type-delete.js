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
      let deleteIcon = new DeleteButton();
        let deleteBox = this.boxHelper.boxWrapDelete({
            "headingText" : `${deleteIcon} Delete?`,
            "descriptionText" : "Edit attribute.",
            "level":3,
            "collapsed":true
          });

          return deleteBox;
    }
}