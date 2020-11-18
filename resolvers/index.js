
module.exports = {
    Sites: (siteRecord, authRecord) => {
        return siteRecord.fields.Users && siteRecord.fields.Users.includes(authRecord.id)
    }
}