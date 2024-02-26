const {
  buildSuccObject,
  buildErrObject,
  itemNotFound
} = require('../middleware/utils')

/**
 * Builds sorting
 * @param {string} sort - field to sort from
 * @param {number} order - order for query (1,-1)
 */
const buildSort = (sort, order) => {
  const sortBy = {}
  sortBy[sort] = order
  return sortBy
}

/**
 * Hack for mongoose-paginate, removes 'id' from results
 * @param {Object} result - result object
 */
const cleanPaginationID = result => {
  result.docs.map(element => delete element.id)
  return result
}

/**
 * Builds initial options for query
 * @param {Object} query - query object
 */
const listInitOptions = async req => {
  return new Promise(resolve => {
    const order = req.query.order || -1
    const sort = req.query.sort || 'createdAt'
    const sortBy = buildSort(sort, order)
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 5
    const options = {
      sort: sortBy,
      lean: true,
      page,
      limit
    }
    resolve(options)
  })
}

module.exports = {
  /**
   * Checks the query string for filtering records
   * query.filter should be the text to search (string)
   * query.fields should be the fields to search into (array)
   * @param {Object} query - query object
   */
  async checkQueryString(query) {
    return new Promise((resolve, reject) => {
      try {
        if (
          typeof query.filter !== 'undefined' &&
          typeof query.fields !== 'undefined'
        ) {
          const data = {
            $or: []
          }
          const array = []
          // Takes fields param and builds an array by splitting with ','
          const arrayFields = query.fields.split(',')
          // Adds SQL Like %word% with regex
          arrayFields.map(item => {
            array.push({
              [item]: {
                $regex: new RegExp(query.filter, 'i')
              }
            })
          })
          // Puts array result in data
          data.$or = array
          resolve(data)
        } else {
          resolve({})
        }
      } catch (err) {
        console.log(err.message)
        reject(buildErrObject(422, 'ERROR_WITH_FILTER'))
      }
    })
  },

  /**
   * Gets items from database
   * @param {Object} req - request object
   * @param {Object} query - query object
   */
  async getItems(req, model, query) {
    const options = await listInitOptions(req)
    return new Promise((resolve, reject) => {
      model.paginate(query, options, (err, items) => {
        if (err) {
          reject(buildErrObject(422, err.message))
        }
        resolve(cleanPaginationID(items))
      })
    })
  },

  /**
   * Gets item from database by id
   * @param {string} id - item id
   */
  async getItem(id, model) {
    return new Promise((resolve, reject) => {
      model.findById(id, (err, item) => {
        itemNotFound(err, item, reject, 'NOT_FOUND')
        resolve(item)
      })
    })
  },

  /**
   * Creates a new item in database
   * @param {Object} req - request object
   */
  async createItem(req, model) {
    return new Promise((resolve, reject) => {
      model.create(req, (err, item) => {
        if (err) {
          reject(buildErrObject(422, err.message))
        }
        resolve(item)
      })
    })
  },

  /**
   * Updates an item in database by id
   * @param {string} id - item id
   * @param {Object} req - request object
   */
  async updateItem(id, model, req) {
    return new Promise((resolve, reject) => {
      model.findByIdAndUpdate(
        id,
        req,
        {
          new: true,
          runValidators: true
        },
        (err, item) => {
          itemNotFound(err, item, reject, 'NOT_FOUND')
          resolve(item)
        }
      )
    })
  },

  /**
   * Deletes an item from database by id
   * @param {string} id - id of item
   */
  async deleteItem(id, model) {
    return new Promise((resolve, reject) => {
      model.findByIdAndRemove(id, (err, item) => {
        itemNotFound(err, item, reject, 'NOT_FOUND')
        resolve(buildSuccObject('DELETED'))
      })
    })
  },

  async getAPIKeys(model, data){
    return new Promise(async (resolve, reject) => {
      try{

        const condition = {
          // user_id: mongoose.Types.ObjectId(data.user_id)
        }

        if (data.search) {
          data.search = data.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          condition.$or = [
            { "client_name": new RegExp(`${data.search}`, 'i') },
            { "client_email": new RegExp(`${data.search}`, 'i') },
            { "api_key": new RegExp(`${data.search}`, 'i') },
            { "domain_name": new RegExp(`${data.search}`, 'i') }
          ]
        }

        if(data.start_date && data.end_date){

          const startDate = new Date(`${data.start_date}T00:00:00Z`);
          const endDate = new Date(`${data.end_date}T23:59:59Z`); 

          condition.date = {
            $gte: startDate,
            $lte: endDate,
          }


        }

        const agg = [         
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: data.sort ? Number(data.sort): -1
            }
          },
          {
            $skip: data.offset ? Number(data.offset) : 0
          },
          {
            $limit: data.limit ? Number(data.limit) : 10
          }
        ]

        const result = await model.aggregate(agg)

        // Now remove limit and offset
        const findLimit = agg.findIndex(item => item.hasOwnProperty('$limit'))
        agg.splice(findLimit, 1)
        const findOffset = agg.findIndex(item => item.hasOwnProperty('$offset'))
        agg.splice(findOffset, 1)

        agg.push({
          $count: 'createdAt'
        })

        const count = await model.aggregate(agg);

        resolve({
          list: result,
          count: count.length ? count[0].createdAt : 0
        })

      }catch(err){
        reject(buildErrObject(422, err.message))
      }
    })
  }
}
