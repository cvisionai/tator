class CardData {
    constructor({ 
        projectId = null,
        localizations = [], 
        localizationTypes = [], 
        getFrame = null, // endpoint with project reference
        getUser = null, // endpoint with project reference
        localizationsCount = null // endpoint with project reference 
      }){
          this.projectId = projectId;
          this.localizations = localizations;
          this.localizationTypes = localizationTypes;
          this.getFrame = getFrame;
          this.getUser = getUser;
          this.localizationCount = localizationsCount;
    }

    getLocalizationsCount(){
        // Used by paginator?
    }

    makeCardList(){
        const cardList = [];
        for(let l of this.localizations){
            let id = l.id;
            let metaDetails = this.findMetaDetails( l.meta );
            let mediaLink = document.createElement("a");
            mediaLink.setAttribute("href", `/${this.projectId}/annotation/${l.media}`)
            mediaLink.innerHTML = `Media ID ${l.media}`;
            let frameImage = await this.frameImage(l.frame);
            let attributes = l.attributes;
            let created = new Date(l.created_datetime);
            let modified = new Date(l.modified_datetime);
            let userData = await this.getUser(l.modified_by);
            let userName = userData.username;

            let card = {
                id,
                metaDetails,
                mediaLink,
                frameImage,
                attributes,
                created,
                modified,
                userName
            }

            cardList.push(card);
        }
        return cardList;
    }

    findMetaDetails(id){
        for(let lt of this.localizationTypes){
            if(lt.id == id){
                return { name: lt.name, type: lt.dtype };
            }
        }
    }
}