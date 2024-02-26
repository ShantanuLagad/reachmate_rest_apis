const model = require('../models/user')
const uuid = require('uuid')
const { matchedData } = require('express-validator')
const utils = require('../middleware/utils')
const db = require('../middleware/db')
const {
    INTERNAL_SERVER_ERROR
} = require('../middleware/error_messages')
const emailer = require('../middleware/emailer')
const FIPS_STATES = require('../../data/fips_states.js')
const { singleFamily, multipleFamily } = require('../../data/property_types.js')
const {
    POST,
    GET
} = require('../middleware/axios')

const demoPlaces = {
    "code": 200,
    "data": [
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "38 El Corazon",
            "sa_val_transfer": "680000",
            "sa_date_transfer": "2018-08-21",
            "sa_sqft": "1735",
            "sa_property_id": "0039167693",
            "sa_y_coord": "33.638303",
            "sa_x_coord": "-117.59739"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "36 El Corazon",
            "sa_val_transfer": "619000",
            "sa_date_transfer": "2019-10-24",
            "sa_sqft": "1357",
            "sa_property_id": "0039167692",
            "sa_y_coord": "33.638397",
            "sa_x_coord": "-117.597468"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "17 Calle Del Rio",
            "sa_val_transfer": "199500",
            "sa_date_transfer": "1997-12-10",
            "sa_sqft": "1913",
            "sa_property_id": "0039167227",
            "sa_y_coord": "33.637581",
            "sa_x_coord": "-117.597507"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "15 Calle Del Rio",
            "sa_val_transfer": "555000",
            "sa_date_transfer": "2005-02-22",
            "sa_sqft": "1645",
            "sa_property_id": "0039167226",
            "sa_y_coord": "33.637488",
            "sa_x_coord": "-117.597642"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "40 El Corazon",
            "sa_val_transfer": "650000",
            "sa_date_transfer": "2020-08-26",
            "sa_sqft": "1493",
            "sa_property_id": "0039167694",
            "sa_y_coord": "33.638201",
            "sa_x_coord": "-117.597281"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "11 Calle Del Rio",
            "sa_val_transfer": "690000",
            "sa_date_transfer": "2017-08-11",
            "sa_sqft": "1913",
            "sa_property_id": "0039167225",
            "sa_y_coord": "33.637391",
            "sa_x_coord": "-117.597808"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "19 Calle Del Rio",
            "sa_val_transfer": "711500",
            "sa_date_transfer": "2018-03-26",
            "sa_sqft": "1645",
            "sa_property_id": "0039167228",
            "sa_y_coord": "33.637665",
            "sa_x_coord": "-117.597322"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "42 El Corazon",
            "sa_val_transfer": "196000",
            "sa_date_transfer": "1998-06-11",
            "sa_sqft": "1735",
            "sa_property_id": "0039167695",
            "sa_y_coord": "33.638093",
            "sa_x_coord": "-117.597153"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "9 Calle Del Rio",
            "sa_val_transfer": "216000",
            "sa_date_transfer": "1997-06-12",
            "sa_sqft": "2146",
            "sa_property_id": "0039167224",
            "sa_y_coord": "33.637301",
            "sa_x_coord": "-117.597983"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "34 El Corazon",
            "sa_val_transfer": "606000",
            "sa_date_transfer": "2017-01-18",
            "sa_sqft": "1651",
            "sa_property_id": "0039167691",
            "sa_y_coord": "33.638697",
            "sa_x_coord": "-117.597635"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "53 Via Vicini",
            "sa_val_transfer": "346000",
            "sa_date_transfer": "2010-06-08",
            "sa_sqft": "1321",
            "sa_property_id": "0079209671",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "91 Via Vicini",
            "sa_val_transfer": "320000",
            "sa_date_transfer": "2010-09-30",
            "sa_sqft": "1321",
            "sa_property_id": "0080542939",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "89 Via Vicini",
            "sa_val_transfer": "548000",
            "sa_date_transfer": "2020-12-11",
            "sa_sqft": "1228",
            "sa_property_id": "0080542940",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "87 Via Vicini",
            "sa_val_transfer": "520000",
            "sa_date_transfer": "2017-02-16",
            "sa_sqft": "1473",
            "sa_property_id": "0080542941",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "183 Via Vicini",
            "sa_val_transfer": "205500",
            "sa_date_transfer": "1999-12-08",
            "sa_sqft": "1473",
            "sa_property_id": "0080543043",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "206 Via Vicini",
            "sa_val_transfer": "435000",
            "sa_date_transfer": "2013-06-13",
            "sa_sqft": "1429",
            "sa_property_id": "0080543048",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "85 Via Vicini",
            "sa_val_transfer": "325000",
            "sa_date_transfer": "2003-04-01",
            "sa_sqft": "1429",
            "sa_property_id": "0080542948",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "77 Via Vicini",
            "sa_val_transfer": "445000",
            "sa_date_transfer": "2014-10-31",
            "sa_sqft": "1429",
            "sa_property_id": "0080542952",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "71 Via Vicini",
            "sa_val_transfer": "445000",
            "sa_date_transfer": "2008-06-25",
            "sa_sqft": "1473",
            "sa_property_id": "0080542954",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "67 Via Vicini",
            "sa_val_transfer": "440000",
            "sa_date_transfer": "2013-07-12",
            "sa_sqft": "1429",
            "sa_property_id": "0080542955",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "65 Via Vicini",
            "sa_val_transfer": "517000",
            "sa_date_transfer": "2019-10-30",
            "sa_sqft": "1321",
            "sa_property_id": "0080542956",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "59 Via Vicini",
            "sa_val_transfer": "182000",
            "sa_date_transfer": "1999-06-18",
            "sa_sqft": "1473",
            "sa_property_id": "0080542959",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "51 Via Vicini",
            "sa_val_transfer": "186500",
            "sa_date_transfer": "1999-06-18",
            "sa_sqft": "1429",
            "sa_property_id": "0080542962",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "52 Via Vicini",
            "sa_val_transfer": "460000",
            "sa_date_transfer": "2016-07-05",
            "sa_sqft": "1228",
            "sa_property_id": "0080542964",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "56 Via Vicini",
            "sa_val_transfer": "345000",
            "sa_date_transfer": "2012-06-06",
            "sa_sqft": "1429",
            "sa_property_id": "0080542966",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "47 Via Vicini",
            "sa_val_transfer": "450000",
            "sa_date_transfer": "2015-08-25",
            "sa_sqft": "1321",
            "sa_property_id": "0080542968",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "2000",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "107 Via Vicini",
            "sa_val_transfer": "290000",
            "sa_date_transfer": "2002-08-30",
            "sa_sqft": "1321",
            "sa_property_id": "0080542975",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "35 Via Vicini",
            "sa_val_transfer": "82300000",
            "sa_date_transfer": "2022-04-19",
            "sa_sqft": "1429",
            "sa_property_id": "0080542982",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "29 Via Vicini",
            "sa_val_transfer": "590000",
            "sa_date_transfer": "2020-11-12",
            "sa_sqft": "1473",
            "sa_property_id": "0080542985",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "25 Via Vicini",
            "sa_val_transfer": "298500",
            "sa_date_transfer": "2003-03-20",
            "sa_sqft": "1321",
            "sa_property_id": "0080542987",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "23 Via Vicini",
            "sa_val_transfer": "560000",
            "sa_date_transfer": "2017-05-15",
            "sa_sqft": "1429",
            "sa_property_id": "0080542988",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "4 Via Vicini",
            "sa_val_transfer": "532000",
            "sa_date_transfer": "2020-09-08",
            "sa_sqft": "1228",
            "sa_property_id": "0080542990",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "14 Via Vicini",
            "sa_val_transfer": "335000",
            "sa_date_transfer": "2003-08-05",
            "sa_sqft": "1321",
            "sa_property_id": "0080542993",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "22 Via Vicini",
            "sa_val_transfer": "600000",
            "sa_date_transfer": "2019-06-24",
            "sa_sqft": "1473",
            "sa_property_id": "0080542997",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "113 Via Vicini",
            "sa_val_transfer": "420000",
            "sa_date_transfer": "2015-07-27",
            "sa_sqft": "1228",
            "sa_property_id": "0080542998",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "117 Via Vicini",
            "sa_val_transfer": "615000",
            "sa_date_transfer": "2020-11-25",
            "sa_sqft": "1429",
            "sa_property_id": "0080543000",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "119 Via Vicini",
            "sa_val_transfer": "700000",
            "sa_date_transfer": "2021-05-24",
            "sa_sqft": "1473",
            "sa_property_id": "0080543001",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "123 Via Vicini",
            "sa_val_transfer": "457500",
            "sa_date_transfer": "2016-04-01",
            "sa_sqft": "1321",
            "sa_property_id": "0080543003",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "125 Via Vicini",
            "sa_val_transfer": "319000",
            "sa_date_transfer": "2003-07-02",
            "sa_sqft": "1321",
            "sa_property_id": "0080543004",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "124 Via Vicini",
            "sa_val_transfer": "525000",
            "sa_date_transfer": "2020-11-09",
            "sa_sqft": "1228",
            "sa_property_id": "0080543011",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "134 Via Vicini",
            "sa_val_transfer": "395000",
            "sa_date_transfer": "2014-12-29",
            "sa_sqft": "1321",
            "sa_property_id": "0080543016",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "137 Via Vicini",
            "sa_val_transfer": "330000",
            "sa_date_transfer": "2011-02-23",
            "sa_sqft": "1635",
            "sa_property_id": "0080543018",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "141 Via Vicini",
            "sa_val_transfer": "750000",
            "sa_date_transfer": "2022-01-31",
            "sa_sqft": "1321",
            "sa_property_id": "0080543020",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "145 Via Vicini",
            "sa_val_transfer": "880000",
            "sa_date_transfer": "2022-02-22",
            "sa_sqft": "1581",
            "sa_property_id": "0080543022",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "149 Via Vicini",
            "sa_val_transfer": "544000",
            "sa_date_transfer": "2021-01-14",
            "sa_sqft": "1321",
            "sa_property_id": "0080543024",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "159 Via Vicini",
            "sa_val_transfer": "274000",
            "sa_date_transfer": "2001-11-19",
            "sa_sqft": "1581",
            "sa_property_id": "0080543029",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "158 Via Vicini",
            "sa_val_transfer": "470000",
            "sa_date_transfer": "2015-08-06",
            "sa_sqft": "1429",
            "sa_property_id": "0080543033",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "163 Via Vicini",
            "sa_val_transfer": "710000",
            "sa_date_transfer": "2021-09-09",
            "sa_sqft": "1321",
            "sa_property_id": "0080543035",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "171 Via Vicini",
            "sa_val_transfer": "589000",
            "sa_date_transfer": "2017-09-22",
            "sa_sqft": "1710",
            "sa_property_id": "0080543038",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "177 Via Vicini",
            "sa_val_transfer": "500000",
            "sa_date_transfer": "2015-12-17",
            "sa_sqft": "1581",
            "sa_property_id": "0080543040",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "179 Via Vicini",
            "sa_val_transfer": "380000",
            "sa_date_transfer": "2010-05-14",
            "sa_sqft": "1581",
            "sa_property_id": "0080543041",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "93 Via Vicini",
            "sa_val_transfer": "480000",
            "sa_date_transfer": "2013-06-28",
            "sa_sqft": "1581",
            "sa_property_id": "0080542938",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "204 Via Vicini",
            "sa_val_transfer": "0",
            "sa_date_transfer": "0000-00-00",
            "sa_sqft": "1321",
            "sa_property_id": "0080543049",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "200 Via Vicini",
            "sa_val_transfer": "170000",
            "sa_date_transfer": "1999-12-30",
            "sa_sqft": "1228",
            "sa_property_id": "0080543051",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "196 Via Vicini",
            "sa_val_transfer": "610000",
            "sa_date_transfer": "2018-03-06",
            "sa_sqft": "1473",
            "sa_property_id": "0080543056",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "88 Via Vicini",
            "sa_val_transfer": "500000",
            "sa_date_transfer": "2018-08-03",
            "sa_sqft": "1321",
            "sa_property_id": "0080542943",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "84 Via Vicini",
            "sa_val_transfer": "314000",
            "sa_date_transfer": "2011-06-17",
            "sa_sqft": "1473",
            "sa_property_id": "0080542945",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "82 Via Vicini",
            "sa_val_transfer": "312500",
            "sa_date_transfer": "2003-05-08",
            "sa_sqft": "1321",
            "sa_property_id": "0080542946",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "83 Via Vicini",
            "sa_val_transfer": "475000",
            "sa_date_transfer": "2017-11-28",
            "sa_sqft": "1321",
            "sa_property_id": "0080542949",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "81 Via Vicini",
            "sa_val_transfer": "310000",
            "sa_date_transfer": "2009-09-14",
            "sa_sqft": "1228",
            "sa_property_id": "0080542950",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "75 Via Vicini",
            "sa_val_transfer": "471000",
            "sa_date_transfer": "2017-07-27",
            "sa_sqft": "1321",
            "sa_property_id": "0080542953",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "63 Via Vicini",
            "sa_val_transfer": "345000",
            "sa_date_transfer": "2013-03-06",
            "sa_sqft": "1228",
            "sa_property_id": "0080542957",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "61 Via Vicini",
            "sa_val_transfer": "760000",
            "sa_date_transfer": "2022-11-29",
            "sa_sqft": "1473",
            "sa_property_id": "0080542958",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "57 Via Vicini",
            "sa_val_transfer": "450000",
            "sa_date_transfer": "2017-12-11",
            "sa_sqft": "1228",
            "sa_property_id": "0080542960",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "54 Via Vicini",
            "sa_val_transfer": "590000",
            "sa_date_transfer": "2021-04-14",
            "sa_sqft": "1321",
            "sa_property_id": "0080542965",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "49 Via Vicini",
            "sa_val_transfer": "0",
            "sa_date_transfer": "0000-00-00",
            "sa_sqft": "1473",
            "sa_property_id": "0080542967",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "41 Via Vicini",
            "sa_val_transfer": "0",
            "sa_date_transfer": "0000-00-00",
            "sa_sqft": "1321",
            "sa_property_id": "0080542971",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "37 Via Vicini",
            "sa_val_transfer": "820000",
            "sa_date_transfer": "2022-08-11",
            "sa_sqft": "1473",
            "sa_property_id": "0080542973",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "2000",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "99 Via Vicini",
            "sa_val_transfer": "461000",
            "sa_date_transfer": "2007-05-04",
            "sa_sqft": "1321",
            "sa_property_id": "0080542979",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "97 Via Vicini",
            "sa_val_transfer": "415000",
            "sa_date_transfer": "2016-01-28",
            "sa_sqft": "1228",
            "sa_property_id": "0080542980",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "95 Via Vicini",
            "sa_val_transfer": "439000",
            "sa_date_transfer": "2015-10-09",
            "sa_sqft": "1473",
            "sa_property_id": "0080542981",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "33 Via Vicini",
            "sa_val_transfer": "429000",
            "sa_date_transfer": "2015-10-09",
            "sa_sqft": "1321",
            "sa_property_id": "0080542983",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "10 Via Vicini",
            "sa_val_transfer": "330000",
            "sa_date_transfer": "2011-10-24",
            "sa_sqft": "1473",
            "sa_property_id": "0080542992",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "133 Via Vicini",
            "sa_val_transfer": "167000",
            "sa_date_transfer": "1999-10-07",
            "sa_sqft": "1321",
            "sa_property_id": "0080543008",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "135 Via Vicini",
            "sa_val_transfer": "316000",
            "sa_date_transfer": "2011-10-24",
            "sa_sqft": "1581",
            "sa_property_id": "0080543009",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "126 Via Vicini",
            "sa_val_transfer": "466000",
            "sa_date_transfer": "2016-03-03",
            "sa_sqft": "1321",
            "sa_property_id": "0080543012",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "139 Via Vicini",
            "sa_val_transfer": "313000",
            "sa_date_transfer": "2009-10-05",
            "sa_sqft": "1228",
            "sa_property_id": "0080543019",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "143 Via Vicini",
            "sa_val_transfer": "472500",
            "sa_date_transfer": "2005-07-29",
            "sa_sqft": "1321",
            "sa_property_id": "0080543021",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "147 Via Vicini",
            "sa_val_transfer": "219000",
            "sa_date_transfer": "1999-11-15",
            "sa_sqft": "1473",
            "sa_property_id": "0080543023",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "155 Via Vicini",
            "sa_val_transfer": "780000",
            "sa_date_transfer": "2022-05-18",
            "sa_sqft": "1228",
            "sa_property_id": "0080543027",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "154 Via Vicini",
            "sa_val_transfer": "533000",
            "sa_date_transfer": "2020-09-02",
            "sa_sqft": "1228",
            "sa_property_id": "0080543031",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "12 Via Vicini",
            "sa_val_transfer": "520000",
            "sa_date_transfer": "2019-04-26",
            "sa_sqft": "1228",
            "sa_property_id": "0057084793",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "73 Via Vicini",
            "sa_val_transfer": "274000",
            "sa_date_transfer": "2003-02-20",
            "sa_sqft": "1228",
            "sa_property_id": "0079227136",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "175 Via Vicini",
            "sa_val_transfer": "230000",
            "sa_date_transfer": "2000-09-22",
            "sa_sqft": "1321",
            "sa_property_id": "0079303941",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "111 Via Vicini",
            "sa_val_transfer": "245000",
            "sa_date_transfer": "2000-10-12",
            "sa_sqft": "1473",
            "sa_property_id": "0079705887",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "181 Via Vicini",
            "sa_val_transfer": "535000",
            "sa_date_transfer": "2018-10-26",
            "sa_sqft": "1321",
            "sa_property_id": "0080543042",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "185 Via Vicini",
            "sa_val_transfer": "820000",
            "sa_date_transfer": "2023-03-16",
            "sa_sqft": "1581",
            "sa_property_id": "0080543044",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "187 Via Vicini",
            "sa_val_transfer": "710000",
            "sa_date_transfer": "2023-01-10",
            "sa_sqft": "1321",
            "sa_property_id": "0080543045",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "191 Via Vicini",
            "sa_val_transfer": "264000",
            "sa_date_transfer": "2001-12-31",
            "sa_sqft": "1473",
            "sa_property_id": "0080543047",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "202 Via Vicini",
            "sa_val_transfer": "709000",
            "sa_date_transfer": "2022-12-07",
            "sa_sqft": "1321",
            "sa_property_id": "0080543050",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "190 Via Vicini",
            "sa_val_transfer": "791000",
            "sa_date_transfer": "2021-08-10",
            "sa_sqft": "1429",
            "sa_property_id": "0080543053",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "192 Via Vicini",
            "sa_val_transfer": "450000",
            "sa_date_transfer": "2004-03-30",
            "sa_sqft": "1321",
            "sa_property_id": "0080543054",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "194 Via Vicini",
            "sa_val_transfer": "425000",
            "sa_date_transfer": "2014-07-18",
            "sa_sqft": "1228",
            "sa_property_id": "0080543055",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "90 Via Vicini",
            "sa_val_transfer": "557000",
            "sa_date_transfer": "2021-01-22",
            "sa_sqft": "1473",
            "sa_property_id": "0080542942",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "86 Via Vicini",
            "sa_val_transfer": "0",
            "sa_date_transfer": "0000-00-00",
            "sa_sqft": "1429",
            "sa_property_id": "0080542944",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "80 Via Vicini",
            "sa_val_transfer": "540000",
            "sa_date_transfer": "2018-08-24",
            "sa_sqft": "1429",
            "sa_property_id": "0080542947",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "79 Via Vicini",
            "sa_val_transfer": "180000",
            "sa_date_transfer": "1999-05-26",
            "sa_sqft": "1473",
            "sa_property_id": "0080542951",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "55 Via Vicini",
            "sa_val_transfer": "426000",
            "sa_date_transfer": "2015-07-22",
            "sa_sqft": "1321",
            "sa_property_id": "0080542961",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "50 Via Vicini",
            "sa_val_transfer": "518000",
            "sa_date_transfer": "2016-07-13",
            "sa_sqft": "1473",
            "sa_property_id": "0080542963",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "45 Via Vicini",
            "sa_val_transfer": "840000",
            "sa_date_transfer": "2023-07-21",
            "sa_sqft": "1429",
            "sa_property_id": "0080542969",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "43 Via Vicini",
            "sa_val_transfer": "262000",
            "sa_date_transfer": "2001-12-06",
            "sa_sqft": "1429",
            "sa_property_id": "0080542970",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "109 Via Vicini",
            "sa_val_transfer": "350000",
            "sa_date_transfer": "2003-08-01",
            "sa_sqft": "1429",
            "sa_property_id": "0080542974",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "105 Via Vicini",
            "sa_val_transfer": "440000",
            "sa_date_transfer": "2016-11-04",
            "sa_sqft": "1228",
            "sa_property_id": "0080542976",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "101 Via Vicini",
            "sa_val_transfer": "599000",
            "sa_date_transfer": "2019-01-28",
            "sa_sqft": "1581",
            "sa_property_id": "0080542978",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "31 Via Vicini",
            "sa_val_transfer": "407000",
            "sa_date_transfer": "2014-02-10",
            "sa_sqft": "1228",
            "sa_property_id": "0080542984",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "2 Via Vicini",
            "sa_val_transfer": "193500",
            "sa_date_transfer": "1999-07-23",
            "sa_sqft": "1473",
            "sa_property_id": "0080542989",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "6 Via Vicini",
            "sa_val_transfer": "173000",
            "sa_date_transfer": "1999-07-23",
            "sa_sqft": "1321",
            "sa_property_id": "0080542991",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "16 Via Vicini",
            "sa_val_transfer": "530000",
            "sa_date_transfer": "2005-07-01",
            "sa_sqft": "1429",
            "sa_property_id": "0080542994",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "18 Via Vicini",
            "sa_val_transfer": "463000",
            "sa_date_transfer": "2015-07-13",
            "sa_sqft": "1429",
            "sa_property_id": "0080542995",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "20 Via Vicini",
            "sa_val_transfer": "0",
            "sa_date_transfer": "2006-01-13",
            "sa_sqft": "1321",
            "sa_property_id": "0080542996",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "115 Via Vicini",
            "sa_val_transfer": "174500",
            "sa_date_transfer": "1999-10-28",
            "sa_sqft": "1321",
            "sa_property_id": "0080542999",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "121 Via Vicini",
            "sa_val_transfer": "711000",
            "sa_date_transfer": "2022-04-25",
            "sa_sqft": "1228",
            "sa_property_id": "0080543002",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "127 Via Vicini",
            "sa_val_transfer": "191000",
            "sa_date_transfer": "1999-11-02",
            "sa_sqft": "1581",
            "sa_property_id": "0080543005",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "129 Via Vicini",
            "sa_val_transfer": "196500",
            "sa_date_transfer": "1999-11-12",
            "sa_sqft": "1473",
            "sa_property_id": "0080543006",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "131 Via Vicini",
            "sa_val_transfer": "440000",
            "sa_date_transfer": "2007-04-20",
            "sa_sqft": "1228",
            "sa_property_id": "0080543007",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "122 Via Vicini",
            "sa_val_transfer": "610000",
            "sa_date_transfer": "2020-07-28",
            "sa_sqft": "1711",
            "sa_property_id": "0080543010",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "128 Via Vicini",
            "sa_val_transfer": "403000",
            "sa_date_transfer": "2010-05-25",
            "sa_sqft": "1655",
            "sa_property_id": "0080543013",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "130 Via Vicini",
            "sa_val_transfer": "390000",
            "sa_date_transfer": "2003-09-30",
            "sa_sqft": "1473",
            "sa_property_id": "0080543014",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "132 Via Vicini",
            "sa_val_transfer": "524000",
            "sa_date_transfer": "2020-02-25",
            "sa_sqft": "1228",
            "sa_property_id": "0080543015",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "136 Via Vicini",
            "sa_val_transfer": "542600",
            "sa_date_transfer": "2017-11-09",
            "sa_sqft": "1429",
            "sa_property_id": "0080543017",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "151 Via Vicini",
            "sa_val_transfer": "800000",
            "sa_date_transfer": "2021-09-17",
            "sa_sqft": "1581",
            "sa_property_id": "0080543025",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "153 Via Vicini",
            "sa_val_transfer": "267000",
            "sa_date_transfer": "2001-08-31",
            "sa_sqft": "1710",
            "sa_property_id": "0080543026",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "157 Via Vicini",
            "sa_val_transfer": "518500",
            "sa_date_transfer": "2019-09-13",
            "sa_sqft": "1321",
            "sa_property_id": "0080543028",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "152 Via Vicini",
            "sa_val_transfer": "553000",
            "sa_date_transfer": "2017-05-18",
            "sa_sqft": "1473",
            "sa_property_id": "0080543030",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "156 Via Vicini",
            "sa_val_transfer": "359000",
            "sa_date_transfer": "2003-11-14",
            "sa_sqft": "1321",
            "sa_property_id": "0080543032",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "161 Via Vicini",
            "sa_val_transfer": "650000",
            "sa_date_transfer": "2021-01-12",
            "sa_sqft": "1581",
            "sa_property_id": "0080543034",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "167 Via Vicini",
            "sa_val_transfer": "203000",
            "sa_date_transfer": "1999-12-29",
            "sa_sqft": "1473",
            "sa_property_id": "0080543037",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "173 Via Vicini",
            "sa_val_transfer": "738000",
            "sa_date_transfer": "2021-10-29",
            "sa_sqft": "1228",
            "sa_property_id": "0080543039",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "27 Via Vicini",
            "sa_val_transfer": "370000",
            "sa_date_transfer": "2009-10-16",
            "sa_sqft": "1473",
            "sa_property_id": "0080542986",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "198 Via Vicini 113",
            "sa_val_transfer": "815000",
            "sa_date_transfer": "2022-07-21",
            "sa_sqft": "1473",
            "sa_property_id": "0080543052",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "189 Via Vicini",
            "sa_val_transfer": "766500",
            "sa_date_transfer": "2023-08-23",
            "sa_sqft": "1228",
            "sa_property_id": "0080543046",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "103 Via Vicini 121",
            "sa_val_transfer": "730000",
            "sa_date_transfer": "2022-12-01",
            "sa_sqft": "1473",
            "sa_property_id": "0080542977",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "8 Via Vicini 49",
            "sa_val_transfer": "540000",
            "sa_date_transfer": "2005-06-23",
            "sa_sqft": "1429",
            "sa_property_id": "0079705886",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "165 Via Vicini",
            "sa_val_transfer": "173500",
            "sa_date_transfer": "1999-11-08",
            "sa_sqft": "1228",
            "sa_property_id": "0080543036",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "39 Via Vicini",
            "sa_val_transfer": "245000",
            "sa_date_transfer": "2002-02-22",
            "sa_sqft": "1228",
            "sa_property_id": "0080542972",
            "sa_y_coord": "33.638752",
            "sa_x_coord": "-117.59833"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "7 Calle Del Rio",
            "sa_val_transfer": "455000",
            "sa_date_transfer": "2009-02-26",
            "sa_sqft": "1645",
            "sa_property_id": "0039167223",
            "sa_y_coord": "33.637233",
            "sa_x_coord": "-117.598135"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "44 El Corazon",
            "sa_val_transfer": "187500",
            "sa_date_transfer": "1998-05-28",
            "sa_sqft": "1651",
            "sa_property_id": "0039167696",
            "sa_y_coord": "33.638018",
            "sa_x_coord": "-117.597042"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "32 El Corazon",
            "sa_val_transfer": "315000",
            "sa_date_transfer": "2001-12-21",
            "sa_sqft": "1735",
            "sa_property_id": "0039167690",
            "sa_y_coord": "33.638798",
            "sa_x_coord": "-117.597685"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "21 Paseo Simpatico",
            "sa_val_transfer": "713000",
            "sa_date_transfer": "2020-08-26",
            "sa_sqft": "1493",
            "sa_property_id": "0039167709",
            "sa_y_coord": "33.6385",
            "sa_x_coord": "-117.597191"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "23 Paseo Simpatico",
            "sa_val_transfer": "0",
            "sa_date_transfer": "0000-00-00",
            "sa_sqft": "1651",
            "sa_property_id": "0039167708",
            "sa_y_coord": "33.638406",
            "sa_x_coord": "-117.597107"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "21 Calle Del Rio",
            "sa_val_transfer": "1026000",
            "sa_date_transfer": "2023-08-21",
            "sa_sqft": "1452",
            "sa_property_id": "0039167229",
            "sa_y_coord": "33.637597",
            "sa_x_coord": "-117.597127"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "25 Paseo Simpatico",
            "sa_val_transfer": "624000",
            "sa_date_transfer": "2016-04-11",
            "sa_sqft": "1735",
            "sa_property_id": "0039167707",
            "sa_y_coord": "33.63832",
            "sa_x_coord": "-117.597015"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "2 Calle De Arena",
            "sa_val_transfer": "481500",
            "sa_date_transfer": "2011-05-06",
            "sa_sqft": "1645",
            "sa_property_id": "0039167249",
            "sa_y_coord": "33.637292",
            "sa_x_coord": "-117.597379"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "46 El Corazon",
            "sa_val_transfer": "412000",
            "sa_date_transfer": "2008-12-18",
            "sa_sqft": "1493",
            "sa_property_id": "0039167697",
            "sa_y_coord": "33.637957",
            "sa_x_coord": "-117.59693"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "30 El Corazon",
            "sa_val_transfer": "1100000",
            "sa_date_transfer": "2022-05-16",
            "sa_sqft": "1651",
            "sa_property_id": "0039167689",
            "sa_y_coord": "33.638895",
            "sa_x_coord": "-117.597733"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "1 Calle Del Mar",
            "sa_val_transfer": "739000",
            "sa_date_transfer": "2019-11-04",
            "sa_sqft": "1913",
            "sa_property_id": "0039167222",
            "sa_y_coord": "33.637139",
            "sa_x_coord": "-117.598298"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "19 Paseo Simpatico",
            "sa_val_transfer": "0",
            "sa_date_transfer": "0000-00-00",
            "sa_sqft": "1651",
            "sa_property_id": "0039167710",
            "sa_y_coord": "33.638806",
            "sa_x_coord": "-117.597366"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "3 Calle De Arena",
            "sa_val_transfer": "675000",
            "sa_date_transfer": "2019-05-15",
            "sa_sqft": "1452",
            "sa_property_id": "0039167253",
            "sa_y_coord": "33.63709",
            "sa_x_coord": "-117.597704"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "23 Calle Del Rio",
            "sa_val_transfer": "420000",
            "sa_date_transfer": "2003-03-21",
            "sa_sqft": "1913",
            "sa_property_id": "0039167230",
            "sa_y_coord": "33.637533",
            "sa_x_coord": "-117.596976"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "28 El Corazon",
            "sa_val_transfer": "527000",
            "sa_date_transfer": "2013-09-10",
            "sa_sqft": "1493",
            "sa_property_id": "0039167688",
            "sa_y_coord": "33.638991",
            "sa_x_coord": "-117.597781"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "48 El Corazon",
            "sa_val_transfer": "960000",
            "sa_date_transfer": "2021-12-21",
            "sa_sqft": "1651",
            "sa_property_id": "0039167698",
            "sa_y_coord": "33.637904",
            "sa_x_coord": "-117.596811"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "17 Paseo Simpatico",
            "sa_val_transfer": "1000000",
            "sa_date_transfer": "2022-04-04",
            "sa_sqft": "1493",
            "sa_property_id": "0039167711",
            "sa_y_coord": "33.638907",
            "sa_x_coord": "-117.597416"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "22 Calle Del Rio",
            "sa_val_transfer": "655000",
            "sa_date_transfer": "2016-01-21",
            "sa_sqft": "1913",
            "sa_property_id": "0039167250",
            "sa_y_coord": "33.637274",
            "sa_x_coord": "-117.597168"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "6 Calle Del Mar",
            "sa_val_transfer": "706000",
            "sa_date_transfer": "2018-03-06",
            "sa_sqft": "1645",
            "sa_property_id": "0039167270",
            "sa_y_coord": "33.636986",
            "sa_x_coord": "-117.597871"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "4 Calle De Arena",
            "sa_val_transfer": "940000",
            "sa_date_transfer": "2021-11-16",
            "sa_sqft": "1913",
            "sa_property_id": "0039167248",
            "sa_y_coord": "33.63714",
            "sa_x_coord": "-117.597317"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "27 Paseo Simpatico",
            "sa_val_transfer": "830000",
            "sa_date_transfer": "2021-10-19",
            "sa_sqft": "1357",
            "sa_property_id": "0039167706",
            "sa_y_coord": "33.638152",
            "sa_x_coord": "-117.596741"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "3 Calle Del Mar",
            "sa_val_transfer": "405000",
            "sa_date_transfer": "2011-02-24",
            "sa_sqft": "1452",
            "sa_property_id": "0039167221",
            "sa_y_coord": "33.636977",
            "sa_x_coord": "-117.598268"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "26 El Corazon",
            "sa_val_transfer": "199000",
            "sa_date_transfer": "1998-11-30",
            "sa_sqft": "1651",
            "sa_property_id": "0039167687",
            "sa_y_coord": "33.639087",
            "sa_x_coord": "-117.597829"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "15 Paseo Simpatico",
            "sa_val_transfer": "567500",
            "sa_date_transfer": "2014-03-27",
            "sa_sqft": "1735",
            "sa_property_id": "0039167712",
            "sa_y_coord": "33.639009",
            "sa_x_coord": "-117.597466"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "5 Calle De Arena",
            "sa_val_transfer": "576000",
            "sa_date_transfer": "2008-03-27",
            "sa_sqft": "2260",
            "sa_property_id": "0039167254",
            "sa_y_coord": "33.636964",
            "sa_x_coord": "-117.597621"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "50 El Corazon",
            "sa_val_transfer": "625000",
            "sa_date_transfer": "2016-09-29",
            "sa_sqft": "1735",
            "sa_property_id": "0039167699",
            "sa_y_coord": "33.637859",
            "sa_x_coord": "-117.596688"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "25 Calle Del Rio",
            "sa_val_transfer": "655000",
            "sa_date_transfer": "2007-06-27",
            "sa_sqft": "1886",
            "sa_property_id": "0039167231",
            "sa_y_coord": "33.63748",
            "sa_x_coord": "-117.596819"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "29 Paseo Simpatico",
            "sa_val_transfer": "340000",
            "sa_date_transfer": "2002-06-26",
            "sa_sqft": "1493",
            "sa_property_id": "0039167705",
            "sa_y_coord": "33.638102",
            "sa_x_coord": "-117.59661"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "24 El Corazon",
            "sa_val_transfer": "720000",
            "sa_date_transfer": "2021-03-11",
            "sa_sqft": "1493",
            "sa_property_id": "0039167686",
            "sa_y_coord": "33.639184",
            "sa_x_coord": "-117.597876"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "24 Calle Del Rio",
            "sa_val_transfer": "705000",
            "sa_date_transfer": "2006-02-10",
            "sa_sqft": "1883",
            "sa_property_id": "0039167251",
            "sa_y_coord": "33.637175",
            "sa_x_coord": "-117.597013"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "5 Calle Del Mar",
            "sa_val_transfer": "0",
            "sa_date_transfer": "2005-11-22",
            "sa_sqft": "1913",
            "sa_property_id": "0039167220",
            "sa_y_coord": "33.636847",
            "sa_x_coord": "-117.598199"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "6 Calle De Arena",
            "sa_val_transfer": "658000",
            "sa_date_transfer": "2019-10-01",
            "sa_sqft": "1452",
            "sa_property_id": "0039167247",
            "sa_y_coord": "33.637023",
            "sa_x_coord": "-117.597223"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "28 Paseo Vecino",
            "sa_val_transfer": "640000",
            "sa_date_transfer": "2019-01-11",
            "sa_sqft": "1735",
            "sa_property_id": "0039167722",
            "sa_y_coord": "33.638482",
            "sa_x_coord": "-117.596687"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "8 Calle Del Mar",
            "sa_val_transfer": "600000",
            "sa_date_transfer": "2004-10-28",
            "sa_sqft": "1913",
            "sa_property_id": "0039167269",
            "sa_y_coord": "33.63683",
            "sa_x_coord": "-117.597789"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "52 El Corazon",
            "sa_val_transfer": "178000",
            "sa_date_transfer": "1998-06-01",
            "sa_sqft": "1357",
            "sa_property_id": "0039167700",
            "sa_y_coord": "33.637824",
            "sa_x_coord": "-117.596561"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "7 Calle De Arena",
            "sa_val_transfer": "635000",
            "sa_date_transfer": "2016-08-31",
            "sa_sqft": "2099",
            "sa_property_id": "0039167255",
            "sa_y_coord": "33.636838",
            "sa_x_coord": "-117.597554"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "27 Calle Del Rio",
            "sa_val_transfer": "685000",
            "sa_date_transfer": "2005-03-25",
            "sa_sqft": "1913",
            "sa_property_id": "0039167232",
            "sa_y_coord": "33.637438",
            "sa_x_coord": "-117.596657"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "22 El Corazon",
            "sa_val_transfer": "315000",
            "sa_date_transfer": "2002-03-13",
            "sa_sqft": "1651",
            "sa_property_id": "0039167685",
            "sa_y_coord": "33.63928",
            "sa_x_coord": "-117.597924"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "31 Paseo Simpatico",
            "sa_val_transfer": "670000",
            "sa_date_transfer": "2018-03-23",
            "sa_sqft": "1651",
            "sa_property_id": "0039167704",
            "sa_y_coord": "33.638065",
            "sa_x_coord": "-117.596482"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "26 Paseo Vecino",
            "sa_val_transfer": "547500",
            "sa_date_transfer": "2014-03-04",
            "sa_sqft": "1651",
            "sa_property_id": "0039167721",
            "sa_y_coord": "33.63859",
            "sa_x_coord": "-117.596636"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "11 Paseo Simpatico",
            "sa_val_transfer": "495000",
            "sa_date_transfer": "2010-09-13",
            "sa_sqft": "1735",
            "sa_property_id": "0039167713",
            "sa_y_coord": "33.639257",
            "sa_x_coord": "-117.597589"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "7 Calle Del Mar",
            "sa_val_transfer": "870000",
            "sa_date_transfer": "2021-04-19",
            "sa_sqft": "1840",
            "sa_property_id": "0039167219",
            "sa_y_coord": "33.636721",
            "sa_x_coord": "-117.598134"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "8 Calle De Arena",
            "sa_val_transfer": "697500",
            "sa_date_transfer": "2019-08-15",
            "sa_sqft": "1645",
            "sa_property_id": "0039167246",
            "sa_y_coord": "33.636905",
            "sa_x_coord": "-117.597145"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "54 El Corazon",
            "sa_val_transfer": "555000",
            "sa_date_transfer": "2004-04-22",
            "sa_sqft": "1651",
            "sa_property_id": "0039167701",
            "sa_y_coord": "33.637798",
            "sa_x_coord": "-117.596431"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "26 Calle Del Rio",
            "sa_val_transfer": "720000",
            "sa_date_transfer": "2017-10-19",
            "sa_sqft": "2146",
            "sa_property_id": "0039167252",
            "sa_y_coord": "33.637054",
            "sa_x_coord": "-117.596906"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "10 Calle Del Mar",
            "sa_val_transfer": "670100",
            "sa_date_transfer": "2017-11-03",
            "sa_sqft": "1913",
            "sa_property_id": "0039167268",
            "sa_y_coord": "33.636704",
            "sa_x_coord": "-117.597724"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "20 Paseo Simpatico",
            "sa_val_transfer": "0",
            "sa_date_transfer": "0000-00-00",
            "sa_sqft": "0",
            "sa_property_id": "0039167715",
            "sa_y_coord": "33.639046",
            "sa_x_coord": "-117.596976"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "20 El Corazon",
            "sa_val_transfer": "680000",
            "sa_date_transfer": "2019-10-18",
            "sa_sqft": "1735",
            "sa_property_id": "0039167764",
            "sa_y_coord": "33.639377",
            "sa_x_coord": "-117.597972"
        },
        {
            "sa_yr_blt": "1999",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "24 Paseo Vecino",
            "sa_val_transfer": "525000",
            "sa_date_transfer": "2014-06-30",
            "sa_sqft": "1493",
            "sa_property_id": "0039167720",
            "sa_y_coord": "33.638689",
            "sa_x_coord": "-117.596582"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "35 Paseo Simpatico",
            "sa_val_transfer": "827000",
            "sa_date_transfer": "2021-04-13",
            "sa_sqft": "1735",
            "sa_property_id": "0039167723",
            "sa_y_coord": "33.638378",
            "sa_x_coord": "-117.596411"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "9 Paseo Simpatico",
            "sa_val_transfer": "426000",
            "sa_date_transfer": "2003-08-29",
            "sa_sqft": "1651",
            "sa_property_id": "0039167714",
            "sa_y_coord": "33.639359",
            "sa_x_coord": "-117.59764"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "9 Calle De Arena",
            "sa_val_transfer": "1119000",
            "sa_date_transfer": "2022-03-01",
            "sa_sqft": "1913",
            "sa_property_id": "0039167256",
            "sa_y_coord": "33.636712",
            "sa_x_coord": "-117.597489"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "3 Calle De Luna",
            "sa_val_transfer": "655000",
            "sa_date_transfer": "2017-07-25",
            "sa_sqft": "1452",
            "sa_property_id": "0039167237",
            "sa_y_coord": "33.637148",
            "sa_x_coord": "-117.596716"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "33 Paseo Simpatico",
            "sa_val_transfer": "267500",
            "sa_date_transfer": "2000-03-13",
            "sa_sqft": "1735",
            "sa_property_id": "0039167703",
            "sa_y_coord": "33.638026",
            "sa_x_coord": "-117.596329"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "29 Calle Del Rio",
            "sa_val_transfer": "490000",
            "sa_date_transfer": "2009-05-06",
            "sa_sqft": "1885",
            "sa_property_id": "0039167233",
            "sa_y_coord": "33.637404",
            "sa_x_coord": "-117.596492"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "9 Calle Del Mar",
            "sa_val_transfer": "595000",
            "sa_date_transfer": "2016-11-30",
            "sa_sqft": "1452",
            "sa_property_id": "0039167218",
            "sa_y_coord": "33.636595",
            "sa_x_coord": "-117.598069"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "37 Paseo Simpatico",
            "sa_val_transfer": "581000",
            "sa_date_transfer": "2015-10-29",
            "sa_sqft": "1651",
            "sa_property_id": "0039167724",
            "sa_y_coord": "33.638481",
            "sa_x_coord": "-117.596363"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "56 El Corazon",
            "sa_val_transfer": "182000",
            "sa_date_transfer": "1998-05-29",
            "sa_sqft": "1493",
            "sa_property_id": "0039167702",
            "sa_y_coord": "33.63778",
            "sa_x_coord": "-117.596286"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "18 El Corazon",
            "sa_val_transfer": "650000",
            "sa_date_transfer": "2017-12-15",
            "sa_sqft": "1493",
            "sa_property_id": "0039167763",
            "sa_y_coord": "33.639474",
            "sa_x_coord": "-117.598022"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "1 Paseo Vecino",
            "sa_val_transfer": "540000",
            "sa_date_transfer": "2014-08-14",
            "sa_sqft": "1493",
            "sa_property_id": "0039167801",
            "sa_y_coord": "33.639339",
            "sa_x_coord": "-117.597265"
        },
        {
            "sa_yr_blt": "1997",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "10 Calle De Arena",
            "sa_val_transfer": "334000",
            "sa_date_transfer": "2000-12-01",
            "sa_sqft": "1913",
            "sa_property_id": "0039167245",
            "sa_y_coord": "33.636777",
            "sa_x_coord": "-117.597084"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "18 Paseo Vecino",
            "sa_val_transfer": "584500",
            "sa_date_transfer": "2004-06-10",
            "sa_sqft": "1651",
            "sa_property_id": "0039167719",
            "sa_y_coord": "33.638775",
            "sa_x_coord": "-117.596503"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "7 Paseo Simpatico",
            "sa_val_transfer": "207500",
            "sa_date_transfer": "1999-05-24",
            "sa_sqft": "1493",
            "sa_property_id": "0039167765",
            "sa_y_coord": "33.639456",
            "sa_x_coord": "-117.597688"
        },
        {
            "sa_yr_blt": "1998",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "12 Calle Del Mar",
            "sa_val_transfer": "589000",
            "sa_date_transfer": "2004-06-17",
            "sa_sqft": "1645",
            "sa_property_id": "0039167267",
            "sa_y_coord": "33.636578",
            "sa_x_coord": "-117.597659"
        },
        {
            "sa_yr_blt": "0",
            "sa_site_city": "Rancho Santa Margarita",
            "v_site_address": "5 Calle De Luna",
            "sa_val_transfer": "415000",
            "sa_date_transfer": "2011-12-19",
            "sa_sqft": "1645",
            "sa_property_id": "0039167238",
            "sa_y_coord": "33.636995",
            "sa_x_coord": "-117.596725"
        }
    ]
}

/********************
 * Private functions *
 ********************/
/*function titleBoxLogin(){
    return new Promise(async (resolve, reject) => {

        try{

            const body = {
                "TbUser":{
                 "username":process.env.TITLE_TOOL_BOX_USERNAME,
                 "password":process.env.TITLE_TOOL_BOX_PASSWORD
               }
            }    
            const headers = {
                "User-Agent": process.env.TITLE_TOOL_BOX_USER_AGENT,
                "Partner-Key": process.env.TITLE_TOOL_BOX_PARTNER_KEY
            }    
            // url, body, headers = {}
            const URL = `${process.env.TITLE_TOOL_BOX_URL}login.json`
            var result = await POST(
                URL,
                body,
                headers
            );

            console.log("body: ", body)

            if(result.response.status == "OK"){
                resolve(result.response)
            }else{
                reject(utils.buildErrObject(422, result.response.data.toString()))  
            }           
            
        }catch(err){
            reject(utils.buildErrObject(500, 'Internal Server Error'))
            console.log(err)
        }
    })
}*/



/********************
 * Public functions *
 ********************/

/**
 * Get items function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.test = async (req, res) => {
  try {    
    var response;

    response = await titleBoxLogin();

    token = response.data.TTBSID;


    res.status(200).json({
        code: 200,
        response: token
    })
  } catch (error) {
    utils.handleError(res, error)
  }
}

function parseCoordinateForPolygon(coordinates){

    var coordStr = '';

    coordinates.forEach((item, index) => {
        if(coordinates.length -1 == index){ // last record should not add `,`
            coordStr += `${item.lng} ${item.lat}`
        }else{
            coordStr += `${item.lng} ${item.lat},`
        }
        

    })
    return coordStr

}

function searchRadius(data){

    return new Promise(async (resolve, reject) => {

        try{

            const objBody = {
                "geometry": {
                    "match": "circle",
                    "value": {
                        "center_lat": data.latitude.toString(),
                        "center_lng": data.longitude.toString(),
                        "radius": data.radius ? data.radius : "0.5"
                    }
                },
                "mm_fips_state_code": data.state_code ? data.state_code: "51" , // just for testing value
                "searchOptions": {
                    "latlon_only": false,
                    "max_limit": Number(data.limit ? data.limit : 300)
                },
                "use_code_std": [
                    "RSFR",
                    "RCON"
                ]
            } 

            var body = Object.assign( {}, objBody, data.filterObj );
            
            const headers = {
                "User-Agent": process.env.TITLE_TOOL_BOX_USER_AGENT,
                "Partner-Key": process.env.TITLE_TOOL_BOX_PARTNER_KEY,
                "Cookie": `TTBSID=${data.token}`
            }    
            // url, body, headers = {}
            const URL = `${process.env.TITLE_TOOL_BOX_URL}global_search.json?limit=${Number(data.limit ? data.limit : 300)}`
            var result = await POST(
                URL,
                body,
                headers
            );

            // console.log(result)

            if(result.response.status == "OK"){
                resolve(result.response)
            }else{
                reject(utils.buildErrObject(422, result.response.data.toString()))  
            } 


        }catch(err){
            reject(utils.buildErrObject(422, err.message))
        }

    })

}

function searchPolygon(data){

    return new Promise(async (resolve, reject) => {

        try{

            const coordStr = await parseCoordinateForPolygon(data.polygon_coordinates);           

            const objBody = {
                "geometry": {
                    "match": "polygon",
                    "value": {
                        "wkt": `POLYGON((${coordStr}))`
                    }
                },
                "searchOptions": {
                    "latlon_only": false,
                    "max_limit": Number(data.limit ? data.limit : 300)
                },
                "mm_fips_state_code": data.state_code ? data.state_code: "51" , // just for testing value
                
            } 

            // merge filter object
            var body = Object.assign( {}, objBody, data.filterObj );

            const headers = {
                "User-Agent": process.env.TITLE_TOOL_BOX_USER_AGENT,
                "Partner-Key": process.env.TITLE_TOOL_BOX_PARTNER_KEY,
                "Cookie": `TTBSID=${data.token}`
            }    
            const URL = `${process.env.TITLE_TOOL_BOX_URL}global_search.json?limit=${Number(data.limit ? data.limit : 300)}`
            var result = await POST(
                URL,
                body,
                headers
            );

            if(result.response.status == "OK"){
                resolve(result.response)
            }else{
                console.log("result.response.data: ", result.response.data)
                reject(utils.buildErrObject(500, INTERNAL_SERVER_ERROR))  
            } 


        }catch(err){
            reject(utils.buildErrObject(422, err.message))
        }

    })

}

function getStateCodeFromLatLng(body){

    return new Promise(async (resolve, reject) => {

        try{

            const result = await GET(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${body.latitude},${body.longitude}&key=${process.env.GOOGLE_MAP_API_KEY}`,
                {},
                {}
            );

            const data = result.data;

            if (data.status === 'OK' && data.results.length > 0) {
              // Loop through address components to find the state
              const addressComponents = data.results[0].address_components;
              let stateCode, stateNumber;

              for (const component of addressComponents) {
                if (component.types.includes('administrative_area_level_1')) {
                  // 'administrative_area_level_1' corresponds to the state
                  stateCode = component.short_name;
                  break;
                }
              }

              if (stateCode) {
                console.log('State Code:', stateCode);
              } else {
                console.error('State code not found in address components.');
              }

              if(stateCode){
                const sNum = Object.keys(FIPS_STATES).find(key => FIPS_STATES[key] === stateCode)
                stateNumber = sNum;
              }

              resolve({
                stateCode: stateCode,
                stateNumber: stateNumber
              })

            }

        }catch(err){
            reject(utils.buildErrObject(422, err.message))
        }

    })

}

const makePropertyFilters = function (data){
    const filters = {};
    if(data.filters){
        const fObj = data.filters;
        if(fObj.bedrooms){            
            filters["sa_nbr_bedrms"] = {
                "match": "From-To",
                "value": {
                  "from": Number(fObj.bedrooms.from),
                  "to": Number(fObj.bedrooms.to)
                }
            }
        }

        if(fObj.year_built){            
            filters["sa_yr_blt"] = {
                /*"match": "=",
                "value": Number(fObj.year_built)*/
                "match": "From-To",
                "value": {
                  "from": Number(fObj.year_built.from),
                  "to": Number(fObj.year_built.to)
                }
            }
        }

        if(fObj.square_feet){            
            filters["sa_sqft"] = {
                /*"match": "=",
                "value": Number(fObj.square_feet)*/
                "match": "From-To",
                "value": {
                  "from": Number(fObj.square_feet.from),
                  "to": Number(fObj.square_feet.to)
                }
            }
        }

        if(fObj.sold_for){            
            filters["sa_val_assd"] = {
                /*"match": "=",
                "value": Number(fObj.bedrooms)*/
                "match": "From-To",
                "value": {
                  "from": Number(fObj.sold_for.from),
                  "to": Number(fObj.sold_for.to)
                }
            }
        }

        if(fObj.sold_at){            

            const from = `${fObj.sold_at.from}-01-01`;
            const to = `${fObj.sold_at.to}-12-31`;

            filters["sa_date_transfer"] = {
                /*"match": "=",
                "value": Number(fObj.sold_at)*/
                "match": "From-To",
                "value": {
                  "from": from,
                  "to": to
                }
            }
        }

        if(fObj.property_type){     
            if(fObj.property_type == "multi_family"){
                filters["use_code_std"] = multipleFamily
            }

            if(fObj.property_type == "single_family"){
                filters["use_code_std"] = singleFamily
            }

            if(fObj.property_type == "all"){
                filters["use_code_std"] = [
                    "RSFR",
                    "RCON"
                ]
            }

            
        }


    }

    return filters


} 

/**
 * search property by Polygon, circle and Radius
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.search = async (req, res) => {
  try {    
    var response;

    const data = req.body; 

    // console.log("data : ", data)

    data.token = req.TTBSID;

    // create filter object
    data.filterObj = await makePropertyFilters(data);

    console.log("filterObj: ",data.filterObj)


    var result = [];
    if(data.search_with == "radius"){
        // Getting the state code from the lat long
        const { stateNumber } = await getStateCodeFromLatLng(data);
        data.state_code = stateNumber;
        const resp = await searchRadius(data);
        result = resp.data.recs

    }

    if(data.search_with == "polygon" && data.polygon_coordinates.length){
        // Getting the state code from the lat long
        const { stateNumber } = await getStateCodeFromLatLng({
            latitude: data.polygon_coordinates[0].lat,
            longitude: data.polygon_coordinates[0].lng,
        });
        // data.state_code = stateNumber;
        data.state_code = stateNumber;
        const resp = await searchPolygon(data);
        if(resp.data.recs){
            result = resp.data.recs
        }else{
            result = []
        }
    }

    if(!result){
        result = []
    }

    var mappedList = result.map(item => {
        return {
            sa_yr_blt: item.sa_yr_blt,
            sa_site_city: item.sa_site_city,
            v_site_address: item.v_site_address,
            sa_val_transfer: item.sa_val_transfer,
            sa_date_transfer: item.sa_date_transfer,
            sa_sqft: item.sa_sqft,
            sa_sqft: item.sa_sqft,
            sa_property_id: item.sa_property_id,
            sa_y_coord: item.sa_y_coord,
            sa_x_coord: item.sa_x_coord,
            sa_nbr_bedrms: item.sa_nbr_bedrms,
            sa_owner_1_first: item.sa_owner_1_first,
            sa_owner_1_last: item.sa_owner_1_last,
            v_mail_address: item.v_mail_address,
            sa_mail_city: item.sa_mail_city,
            sa_mail_state: item.sa_mail_state,
            sa_mail_zip: item.sa_mail_zip,
        }
    })

    res.status(200).json({
        code: 200,
        data: mappedList
    })
  } catch (error) {
    utils.handleError(res, error)
  }
}
