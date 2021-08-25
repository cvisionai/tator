class ProjectTypesData {
    constructor(projectId){
      this.projectId = projectId;
    }

    // Creates navigatable to get from type > entity > attributes
    async _getAttributeDataByType(projectId = this.projectId){
      // Promise all.... then bundle them up
      let promises = this._getAllTypePromises(projectId);
      this.attributeDataByType = {};
  
      const [mta, lo, le, st] = await Promise.all(promises);
      const mediaTypesData = mta.json();
      const localizationData = lo.json();
      const leafTypeData = le.json();
      const stateTypeData = st.json();
      Promise.all([mediaTypesData, localizationData, leafTypeData, stateTypeData])
        .then(([mediaTypes, localization, leaf, state]) => {
          this.attributeDataByType.MediaType = {};
          this.attributeDataByType.LocalizationType = {};
          this.attributeDataByType.LeafType = {};
          this.attributeDataByType.StateType = {};

          for (let entity of mediaTypes) {
            this.attributeDataByType.MediaType[entity.name] = entity.attribute_types;
          }
          for (let entity_1 of localization) {
            this.attributeDataByType.LocalizationType[entity_1.name] = entity_1.attribute_types;
          }
          for (let entity_2 of leaf) {
            this.attributeDataByType.LeafType[entity_2.name] = entity_2.attribute_types;
          }
          for (let entity_3 of state) {
            this.attributeDataByType.StateType[entity_3.name] = entity_3.attribute_types;
          }
        });
        return this.attributeDataByType;
      }

      _getAllTypePromises(){
        this._getMediaTypePromise();
        this._getLocTypePromise();
        this._getLeafTypePromise();
        this._getStateTypePromise();
        this._getMembershipDataPromise();
        this._getVersionsDataPromise();
        this._getAlgoDataPromise();
    
        return [
          this.mediaTypesPromise,
          this.localizationsPromise,
          this.leafTypesPromise,
          this.stateTypesPromise,
          this.membershipPromise,
          this.versionsPromise,
          this.algoPromise
        ];
      }

      _getMediaTypePromise(){
        this.mediaTypesBlock = document.createElement("media-type-main-edit");
        return this.mediaTypesPromise = this.mediaTypesBlock._fetchGetPromise({"id": this.projectId} );
      }

      _getLocTypePromise(){
        this.localizationBlock = document.createElement("localization-edit");
        return this.localizationsPromise = this.localizationBlock._fetchGetPromise({"id": this.projectId} );
      }

      _getLeafTypePromise(){
        this.leafTypesBlock = document.createElement("leaf-type-edit");
        return this.leafTypesPromise = this.leafTypesBlock._fetchGetPromise({"id": this.projectId} );
      }

      _getStateTypePromise(){
        this.stateTypesBlock = document.createElement("state-type-edit");
        return this.stateTypesPromise = this.stateTypesBlock._fetchGetPromise({"id": this.projectId} );
      }

      _getMembershipDataPromise(){
        this.membershipData = new MembershipData(this.projectId);
        return this.membershipPromise = this.membershipData._getMembershipPromise();
      }
  
      _getVersionsDataPromise(){
        this.versionsBlock = document.createElement("versions-edit");
        return this.versionsPromise = this.versionsBlock._fetchGetPromise({"id": this.projectId} );
      }
  
      _getAlgoDataPromise(){
        this.algoBlock = document.createElement("alogorithm-edit");
        return this.algoPromise = this.algoBlock._fetchGetPromise({"id": this.projectId} );
      }
}