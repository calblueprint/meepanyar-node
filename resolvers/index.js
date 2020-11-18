
module.exports = {
    Users: (userRecord, authRecord) => {
        return userRecord.id === authRecord.id
    },
    Sites: (siteRecord, authRecord) => {
        return siteRecord.fields.Users && siteRecord.fields.Users.includes(authRecord.id)
    }
}