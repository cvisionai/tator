class AttributesDelete {
    constructor({
        type, typeId, attributeName, pageDiv
    }){
        this.type = type;
        this.typeId = typeId;
        this.pageDiv = pageDiv;
        this.attributeName = attributeName;
        this.boxHelper = new SettingsBox( this.pageDiv );
    }

    init(){
        let deleteBox = this.boxHelper.boxWrapDelete({
            "headingText" : `Delete ${this.attributeName}?`,
            "descriptionText" : "Edit attribute.",
            "level": 3,
            "collapsed":true
          });

        return deleteBox;
    }
}