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
        
    }
}