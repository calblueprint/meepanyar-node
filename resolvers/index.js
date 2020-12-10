
module.exports = {
    Sites: async (siteRecord, authRecord) => {
        return siteRecord.fields.Users && siteRecord.fields.Users.includes(authRecord.id)
    }
}