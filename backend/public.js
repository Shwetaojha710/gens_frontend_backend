const Helper = require("../../helper/helper");
const menu = require("../../models/menu");
const sequelize = require("../../connection/sequelize");
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const fileType = require("file-type");
const page = require("../../models/pages");
const log = require("../../models/log");
const feedback = require("../../models/feedback");
const faq = require("../../models/faq");
const document = require("../../models/document");
const { col, fn } = require("sequelize");
const { Op } = require("sequelize");
const news = require("../../models/news");
const organizational = require("../../models/organizational");
const managedirectory = require("../../models/managedirectory");
const information_about = require("../../models/information_about");
const vip_doc = require("../../models/vip_doc");
exports.createhtmldata = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // const obj = JSON.parse(req.body);
    const obj = req.body;

    const validateFields = (data) => {
      for (const key in data) {
        if (typeof data[key] === "string") {
          data[key] = data[key].trim(); // Trim spaces before validation
        }

        if (data[key] === "" || data[key] === null || data[key] === undefined) {
          return `Error: ${key} cannot be empty!`;
        }
      }
      return null; // No errors
    };

    // **Apply Validation**
    const validationError = Helper.validateFields(obj);
    if (validationError) {
      await transaction.rollback();
      return Helper.response("failed", validationError, null, res, 200);
    }

    // Create Data
    const createpage = await page.create(obj, { transaction });
    if (createpage) {
      await transaction.commit();
      await log.create({
        tableName: "page",
        recordId: createpage.id,
        action: "CREATE",
        oldData: JSON.stringify(obj),
        newData: JSON.stringify(obj),
        changedBy: req.users.id,
      });

      return Helper.response(
        "success",
        "Data Created Successfully",
        null,
        res,
        200,
      );
    }
  } catch (error) {
    console.error("Error creating HTML data:", error);
    await transaction.rollback();
    return Helper.response(
      "failed",
      error?.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.gethtmldata = async (req, res) => {
  try {
    const createpage = await page.findAll({
      order: [["id", "DESC"]],
    });

    if (createpage.length > 0) {
      return Helper.response(
        "success",
        "Data found Successfully",
        { tableData: createpage },
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.error("Error creating HTML data:", error);
    return Helper.response(
      "failed",
      error?.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.getpublichomebannerImage = async (req, res) => {
  try {
    const lang = req.headers.language == "hi" ? "hn_image_alt" : "image_alt";
    const lang1 =
      req.headers.language == "hi" ? "banner_image_hn" : "banner_image";
    const documentdata = (
      await document.findAll({
        where: {
          status: true,
          doc_type: {
            [Op.or]: {
              [Op.is]: null,
              [Op.eq]: "",
            },
          },
        },
        attributes: [
          "id",
          [lang, "image_alt"],
          [lang1, "banner_image"],
          "order",
          "status",
        ],
        order: [["createdAt", "ASC"]],
      })
    ).map((item) => item.toJSON());
    if (documentdata.length > 0) {
      const sortedData = documentdata
        .filter((item) => item.status === true || item.status === false)
        .sort((a, b) => {
          if (a.order === b.order) {
            return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
          }
          return a.order - b.order; // Sort by order
        });
      let data = [];
      sortedData.map((item) => {
        data.push({
          image_alt: item.image_alt,
          banner_image: item.banner_image,
        });
      });

      console.log(data);
      return Helper.response(
        "success",
        "data found Successfully",
        data,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.geturldata = async (req, res) => {
  try {
    const lang = req.headers.language == "hi" ? "hn_image_alt" : "image_alt";
    const documentdata = (
      await menu.findAll({
        where: {
          status: true,
        },
        attributes: [
          "id",
          [lang, "image_alt"],
          "order",
          "banner_image",
          "status",
        ],
        order: [["createdAt", "ASC"]],
      })
    ).map((item) => item.toJSON());
    if (documentdata.length > 0) {
      const sortedData = documentdata
        .filter((item) => item.status === true || item.status === false)
        .sort((a, b) => {
          if (a.order === b.order) {
            return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
          }
          return a.order - b.order; // Sort by order
        });
      let data = sortedData.map((item) => {
        data.push({
          image_alt: item.image_alt,
          banner_image: item.banner_image,
        });
      });

      console.log(data);
      return Helper.response(
        "success",
        "data found Successfully",
        data,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

// exports.getpublicvideodocument = async (req, res) => {
//   try {
//     console.log(req.body);
//     const lang = req.headers?.language === "hn" ? "hn" : "en";

//     let type = req?.body?.doc_type || null;

//     // Determine the language-specific columns dynamically
//     const languageColumns =
//       lang === "hn"
//         ? ["hn_image_title", "hn_image_alt"]
//         : ["image_title", "image_alt"];
//     const documentdata = (
//       await document.findAll({
//         attributes: [
//           "id",
//           ...languageColumns,
//           "order",
//           "banner_image",
//           "status",
//           "createdAt",
//         ],
//         order: [["createdAt", "ASC"]],
//         where: {
//           doc_type: type,
//           status:true
//         },
//       })
//     ).map((item) => item.toJSON());
//     if (documentdata.length > 0) {
//       return Helper.response(
//         "success",
//         "data found Successfully",
//         { tableData: documentdata },
//         res,
//         200
//       );
//     } else {
//       return Helper.response("failed", "No data found", null, res, 200);
//     }
//   } catch (error) {
//     return Helper.response(
//       "failed",
//       error.message || "Something went wrong",
//       {},
//       res,
//       200
//     );
//   }
// };

function findHierarchy(id, dataArray) {
  let hierarchy = [];
  let currentItem = dataArray.find((item) => item.id === id);

  while (currentItem) {
    hierarchy.unshift(currentItem); // Add to the beginning of the array
    if (currentItem.parent_id === 0) break; // Stop if root is found
    currentItem = dataArray.find((item) => item.id === currentItem.parent_id);
  }

  return hierarchy;
}

exports.getpublicslugdata = async (req, res) => {
  try {
    const lang = req.headers?.language === "hi" ? "hi" : "en";

    // Determine the language-specific columns dynamically
    const languageColumns =
      lang === "hi"
        ? {
            description: "hn_description",
            page_title: "hn_page_title",
            menu: "hn_menu",
          }
        : {
            description: "description",
            page_title: "page_title",
            menu: "menu",
          };

    // Extract the column values from the languageColumns object
    const languageColumnValues = Object.values(languageColumns);
    const documentdata = (
      await menu.findAll({
        attributes: [
          "id",
          "parent_id",
          [col(languageColumns.menu), "menu"],
          [col(languageColumns.page_title), "page_title"],
          [col(languageColumns.description), "description"],
          "page_url",
          "slug",
          "status",
          "createdAt",
        ],
        order: [["order", "ASC"]],
        where: {
          slug: req.body?.slug,
          status: true,
        },
      })
    ).map((item) => item.toJSON());
    const allmenudata = (
      await menu.findAll({
        attributes: [
          "id",
          "parent_id",
          [col(languageColumns.menu), "menu"],
          [col(languageColumns.page_title), "page_title"],
          [col(languageColumns.description), "description"],
          "page_url",
          "slug",
          "status",
          "createdAt",
        ],
        order: [["createdAt", "ASC"]],
        where: {
          status: true,
        },
      })
    ).map((item) => item.toJSON());

  
    if (documentdata.length == 0) {
      return Helper.response("failed", "No data found", null, res, 200);
    }
    const resultHierarchy = findHierarchy(documentdata[0]["id"], allmenudata);
    let sidemenudata;
    if (documentdata[0]["parent_id"] != 0) {
      sidemenudata = await menu.findAll({
        attributes: [
          "id",
          [col(languageColumns.menu), "menu"],
          [col(languageColumns.page_title), "page_title"],
          [col(languageColumns.description), "description"],
          "page_url",
          "slug",
          "status",
          "createdAt",
        ],

        where: {
          parent_id: documentdata[0]["parent_id"],
          status: true,
        },
        order: [["order", "ASC"]],
      });
    }

    let obj = {};
    obj["data"] = documentdata[0];
    obj["bread_crumb"] = resultHierarchy;
    obj["sub_menu"] = sidemenudata?.length > 0 ? sidemenudata : [];
    if (documentdata.length > 0) {
      return Helper.response(
        "success",
        "data found Successfully",
        obj,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.createfeedback = async (req, res) => {
  const transaction = await sequelize.transaction(); // Start transaction

  try {
    console.log(req.body, "req body data");
    let obj = req.body;
    obj.language = req.headers?.language;

    // **Validation Function**
    const validateFields = async (data) => {
      for (const key in data) {
        if (typeof data[key] === "string") {
          data[key] = data[key].trim(); // Trim spaces before validation
        }
        if (data[key] === "" || data[key] === null || data[key] === undefined) {
          return `Error: ${key} cannot be empty!`;
        }
      }
      return null; // No errors
    };

    // **Specific Validation for 'feedback' Key**
    if (
      !obj.feedback ||
      typeof obj.feedback !== "string" ||
      obj.feedback.length < 5
    ) {
      return Helper.response(
        "failed",
        "Feedback must be a string with at least 5 characters.",
        null,
        res,
        200,
      );
    }
    const result = await Helper.validateFeedback(obj);
    if (result.error) {
      await transaction.rollback();
      return Helper.response(
        "failed",
        result.error || "An error occurred",
        {},
        res,
        200,
      );
    }

    const validationError = Helper.validateFields(obj);
    if (validationError) {
      await transaction.rollback(); // Rollback if validation fails
      return Helper.response("failed", validationError, null, res, 200);
    }

    let createfeedback = await feedback.create(obj, { transaction });

    if (createfeedback) {
      // **Log Entry**
      await log.create(
        {
          tableName: "feedback",
          recordId: createfeedback.id,
          module: obj.module,
          action: "CREATE",
          oldData: JSON.stringify(obj),
          newData: JSON.stringify(obj),
        },
        { transaction },
      );
      await transaction.commit();
      return Helper.response(
        "success",
        "Feedback Created Successfully",
        null,
        res,
        200,
      );
    } else {
      await transaction.rollback();
      return Helper.response("failed", "feedback error ", null, res, 200);
    }
  } catch (error) {
    console.error("Error creating menu:", error);
    await transaction.rollback(); // Rollback on error
    return Helper.response(
      "failed",
      error?.errors?.[0]?.message || "An error occurred",
      {},
      res,
      200,
    );
  }
};

exports.gepublicfaqlist = async (req, res) => {
  try {
    let lang = req.headers.language;
    // Determine the language-specific columns dynamically
    const languageColumns =
      lang === "hi"
        ? { question: "hn_question", answer: "hn_answer" }
        : { question: "question", answer: "answer" };
    const documentdata = await faq.findAll({
      attributes: [
        "id",
        [col(languageColumns.question), "question"], // Ensure the key remains "question"
        [col(languageColumns.answer), "answer"],
        "status",
        "createdAt",
      ],
      where: {
        status: true,
      },
      order: [["createdAt", "ASC"]],
    });

    let bread_crumb;
    if (lang == "en") {
      bread_crumb = [
        {
          label: "Faq",
          page_title: "Faq",
          page_url: "/Faq",
          slug: "Faq",
        },
      ];
    } else if (lang == "hi") {
      bread_crumb = [
        {
          label: "अक्सर पूछे जाने वाले प्रश्न",
          page_title: "अक्सर पूछे जाने वाले प्रश्न",
          page_url: "/अक्सर पूछे जाने वाले प्रश्न",
          slug: "अक्सर पूछे जाने वाले प्रश्न",
        },
      ];
    }
    let obj = {};
    obj["data"] = documentdata;
    obj["bread_crumb"] = bread_crumb;

    if (documentdata.length > 0) {
      return Helper.response(
        "success",
        "data found Successfully",
        obj,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.sitemapdata = async (req, res) => {
  try {
    const lang = req.headers?.language === "hn" ? "hn_menu" : "menu";
    const menudata = (
      await menu.findAll({
        where: {
          status: true,
        },
        attributes: [
          "id",
          "parent_id",
          [lang, "label"],
          "page_type",
          "page_url",
          "status",
          "parent_order",
          "order"
        ],
order: [
  [
    sequelize.literal(`
      CASE
        WHEN id = 1 THEN 0   -- Home
        WHEN id = 16 THEN 1  -- About us
        WHEN id = 60 THEN 2  -- Nodal Center
        WHEN id = 14 THEN 3  -- Notification
        WHEN id = 612 THEN 4 -- UPSOSB
        WHEN id = 70 THEN 5  -- RTI
        WHEN id = 3 THEN 6   -- Admission
        WHEN id = 29 THEN 7  -- Contact us
        WHEN id = 48 THEN 8  -- Archives
        WHEN id = 47 THEN 9  -- Web Information Manager
        WHEN id = 46 THEN 10 -- Terms & Conditions
        WHEN id = 43 THEN 11 -- Privacy Policy
        WHEN id = 41 THEN 12 -- Help Desk
        WHEN id = 44 THEN 13 -- Copyright Policy
        ELSE 14
      END
    `),
    "ASC",
  ],
  ["parent_order", "ASC"],
  ["order", "ASC"],
], 





        // order: [
        //   [
        //     sequelize.literal("CASE WHEN page_type = 'Link' THEN 1 ELSE 0 END"),
        //     "ASC",
        //   ],
        //   ["parent_order", "ASC"],
        //   ["order", "ASC"],
        // ],
      })
    ).map((item) => item.toJSON());
    if (menudata.length > 0) {
      // Create a map for quick lookup
      const map = {};
      menudata.forEach((item) => {
        map[item.id] = { ...item, submenu: [] };
      });

      //  Build the tree structure
      let tree = [];
      menudata.forEach((item) => {
        if (item.parent_id !== 0) {
          map[item.parent_id]?.submenu.push(map[item.id]);
        } else {
          tree.push(map[item.id]);
        }
      });
      tree = tree.map((item) => {
        if (Array.isArray(item.submenu) && item.submenu.length === 0) {
          delete item.submenu;
        }
        return item;
      });
      let bread_crumb;
      if (lang == "menu") {
        bread_crumb = [
          {
            label: "Site Map",
            page_title: "Site Map",
            page_url: "/site-map",
            slug: "site-map",
          },
        ];
      } else if (lang == "hn_menu") {
        bread_crumb = [
          {
            label: "साइट मानचित्र",
            page_title: "साइट मानचित्र",
            page_url: "/साइट मानचित्र",
            slug: "साइट मानचित्र",
          },
        ];
      }

      return Helper.response(
        "success",
        "data found Successfully",
        { tableData: tree, bread_crumb },
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.error("Error creating menu:", error);
    return Helper.response("failed", error?.errors?.[0].message, {}, res, 200);
  }
};

exports.getpublicgallerydocument = async (req, res) => {
  try {
    // console.log(req.body);
    const lang = req.headers?.language === "hn" ? "hn" : "en";
    const languageColumns =
      lang === "hn"
        ? { image_alt: "hn_image_alt", image_title: "hn_image_title" }
        : { image_alt: "image_alt", image_title: "image_title" };

    // Extract the column values from the languageColumns object
    const languageColumnValues = Object.values(languageColumns);
    let type = req?.body?.doc_type || null;

    const documentdata = (
      await document.findAll({
        attributes: [
          "id",
          "order",
          "banner_image",
          [col(languageColumns.image_alt), "image_alt"], // Ensure the key remains "question"
          [col(languageColumns.image_title), "image_title"],
          "status",
          "createdAt",
        ],
        order: [["createdAt", "ASC"]],
        where: {
          doc_type: "gallery",
        },
      })
    ).map((item) => item.toJSON());
    let bread_crumb;
    if (lang == "en") {
      bread_crumb = [
        {
          label: "Image Gallery",
          page_title: "Image Gallery",
          page_url: "/image-gallery",
          slug: "image-gallery",
        },
      ];
    } else if (lang == "hn") {
      bread_crumb = [
        {
          label: "छवि गैलरी",
          page_title: "छवि गैलरी",
          page_url: "/image-gallery",
          slug: "image-gallery",
        },
      ];
    }

    let obj = {};
    obj["data"] = documentdata;
    obj["bread_crumb"] = bread_crumb;
    if (documentdata.length > 0) {
      return Helper.response(
        "success",
        "data found Successfully",
        obj,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.error("Error creating menu:", error);
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.getpublicvideodocument = async (req, res) => {
  try {
    const lang = req.headers?.language === "hn" ? "hn" : "en";
    const languageColumns =
      lang === "hn"
        ? { video_description: "hn_image_alt", video_title: "hn_image_title" }
        : { video_description: "image_alt", video_title: "image_title" };
    const languageColumnValues = Object.values(languageColumns);

    const documentdata = (
      await document.findAll({
        where: {
          doc_type: "video",
        },
        attributes: [
          "id",
          [col(languageColumns.video_title), "video_title"],
          [col(languageColumns.video_description), "video_description"],
          [col("banner_image"), "video_url"],
          "status",
          "createdAt",
        ],

        order: [["createdAt", "ASC"]],
      })
    ).map((item) => item.toJSON());
    let bread_crumb;
    if (lang == "en") {
      bread_crumb = [
        {
          label: "Video Gallery",
          page_title: "Video Gallery",
          page_url: "/video-gallery",
          slug: "video-gallery",
        },
      ];
    } else if (lang == "hn") {
      bread_crumb = [
        {
          label: "वीडियो गैलरी",
          page_title: "वीडियो गैलरी",
          page_url: "/video-gallery",
          slug: "video-gallery",
        },
      ];
    }

    let obj = {};
    obj["data"] = documentdata;
    obj["bread_crumb"] = bread_crumb;

    if (documentdata.length > 0) {
      return Helper.response(
        "success",
        "data found Successfully",
        obj,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.error("Error creating menu:", error);
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.getPublicAudioDocument = async (req, res) => {
  try {
    const lang = req.headers?.language === "hn" ? "hn" : "en";
    const languageColumns =
      lang === "hn"
        ? { video_description: "hn_image_alt", video_title: "hn_image_title" }
        : { video_description: "image_alt", video_title: "image_title" };
    const languageColumnValues = Object.values(languageColumns);

    const documentdata = (
      await document.findAll({
        attributes: [
          "id",
          [col(languageColumns.video_title), "video_title"],
          [col(languageColumns.video_description), "video_description"],
          [col("banner_image"), "video_url"],
          "status",
          "createdAt",
        ],
        order: [["createdAt", "ASC"]],
        where: {
          doc_type: "Audio",
        },
      })
    ).map((item) => item.toJSON());
    let bread_crumb;
    if (lang == "en") {
      bread_crumb = [
        {
          label: "Audio Gallery",
          page_title: "Audio Gallery",
          page_url: "/audio-gallery",
          slug: "audio-gallery",
        },
      ];
    } else if (lang == "hn") {
      bread_crumb = [
        {
          label: "ऑडियो गैलरी",
          page_title: "ऑडियो गैलरी",
          page_url: "/audio-gallery",
          slug: "audio-gallery",
        },
      ];
    }

    let obj = {};
    obj["data"] = documentdata;
    obj["bread_crumb"] = bread_crumb;
    if (documentdata.length > 0) {
      return Helper.response(
        "success",
        "data found Successfully",
        obj,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.gepublicnewsdata = async (req, res) => {
  try {
    const lang = req.headers?.language == "hn" ? "hn" : "en";
    const languageColumns =
      lang === "hn"
        ? {
            heading: "hn_heading",
            title: "hn_title",
            description: "hn_description",
            document: "hn_document",
          }
        : {
            heading: "heading",
            title: "title",
            description: "description",
            document: "document",
          };

    // console.log("Language Columns:", languageColumns); // Debugging

    const documentdata = await news.findAll({
      where: {
        type: "News",
        status: 1,
      },
      attributes: [
        "id",
        [col(languageColumns.heading), "heading"],
        [col(languageColumns.title), "title"],
        [col(languageColumns.description), "description"],
        "size",
        "doc_format",
        [fn("DATE_FORMAT", col("updatedAt"), "%Y-%m-%d"), "date"],
        [col(languageColumns.document), "document"],
        "doc_lang",
        "status",
        "createdAt",
        "type",
      ],
      order: [["createdAt", "desc"]],
    });

    let bread_crumb;
    if (lang == "en") {
      bread_crumb = [
        {
          label: "News",
          page_title: "News",
          page_url: "/news",
          slug: "news",
        },
      ];
    } else if (lang == "hn") {
      bread_crumb = [
        {
          label: "समाचार",
          page_title: "समाचार",
          page_url: "/समाचार",
          slug: "समाचार",
        },
      ];
    }

    let obj = {};
    obj["data"] = documentdata;
    obj["bread_crumb"] = bread_crumb;

    if (documentdata.length > 0) {
      return Helper.response(
        "success",
        "Data found successfully",
        obj,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.log(error);
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.getPublicEventsAndAnnouncement = async (req, res) => {
  try {
    const lang = req.headers?.language === "hi" ? "hn" : "en";
    const languageColumns =
      lang === "hn"
        ? {
            heading: "hn_heading",
            title: "hn_title",
            description: "hn_description",
          }
        : { heading: "heading", title: "title", description: "description" };


    const documentdata = await news.findAll({
      where: {
        type: "Events and Announcement",
        status: 1,
      },
      attributes: [
        "id",
        [col(languageColumns.heading), "heading"],
        [col(languageColumns.title), "title"],
        [col(languageColumns.description), "description"],
        "size",
        "doc_format",
        // "date",
        [fn("DATE_FORMAT", col("updatedAt"), "%Y-%m-%d"), "date"],
        "document",
        "doc_lang",
        "status",
        "createdAt",
        "type",
      ],

      order: [["createdAt", "desc"]],
    });

    let bread_crumb;
    if (lang == "en") {
      bread_crumb = [
        {
          label: "Events and Announcement",
          page_title: "Events and Announcement",
          page_url: "/event-and-announcement",
          slug: "event-and-announcement",
        },
      ];
    } else if (lang == "hn") {

      bread_crumb = [
        {
          label: "घटनाएँ और घोषणाएँ",
          page_title: "घटनाएँ और घोषणाएँ",
          page_url: "/event-and-announcement",
          slug: "event-and-announcement",
        },
      ];
    }

    let obj = {};
    obj["data"] = documentdata;
    obj["bread_crumb"] = bread_crumb;

    if (documentdata.length > 0) {
      return Helper.response(
        "success",
        "Data found successfully",
        obj,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.log(error);
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.getlinkmenudata = async (req, res) => {
  try {
    const lang = req.headers.language == "hi" ? "hn_menu" : "menu";
    const menudata = (
      await menu.findAll({
        where: {
          status: true,
          page_type: "link",
        },
        attributes: [
          "id",
          "parent_id",
          [lang, "label"],
          "page_type",
          "page_url",
          "status",
        ],
        order: [["id", "ASC"]],
      })
    ).map((item) => item.toJSON());

    // console.log(menudata,"menudattaa111")
    if (menudata.length > 0) {
      // Create a map for quick lookup
      const map = {};
      menudata.forEach((item) => {
        map[item.id] = { ...item, submenu: [] };
      });

      //  Build the tree structure
      let tree = [];
      menudata.forEach((item) => {
        if (item.parent_id !== 0) {
          map[item.parent_id]?.submenu.push(map[item.id]);
        } else {
          tree.push(map[item.id]);
        }
      });
      tree = tree.map((item) => {
        if (Array.isArray(item.submenu) && item.submenu.length === 0) {
          delete item.submenu;
        }
        return item;
      });

      // Create a map for quick lookup
      // const map = {};
      // menudata.forEach((item) => {
      //   map[item.id] = { ...item, submenu: [] };
      // });

      // //  Build the tree structure
      // let tree = [];
      // menudata.forEach((item) => {
      //   if (item.parent_id !== 0) {
      //     map[item.parent_id]?.submenu.push({
      //       label: map[item.id]["label"],
      //       url: map[item.id]["page_url"],
      //     });
      //   } else {
      //     tree.push({
      //       label: map[item.id]["label"],
      //       url: map[item.id]["page_url"],
      //       submenu: map[item.id]["submenu"],
      //     });
      //   }
      // });
      // tree = tree.map((item) => {
      //   if (Array.isArray(item.submenu) && item.submenu.length === 0) {
      //     delete item.submenu;
      //   }
      //   return item;
      // });

      // //  Output the nested structure
      // // console.log(JSON.stringify(tree, null, 2));

      return Helper.response(
        "success",
        "data found Successfully",
        { tableData: tree },
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.error("Error creating menu:", error);
    return Helper.response("failed", error?.errors?.[0].message, {}, res, 200);
  }
};

exports.getpublicmangementdirdata = async (req, res) => {
  try {
    const lang = req.headers?.language == "hi" ? "hi" : "en";
    const aboutUsBreadcrumb = {
  id: 16,
  parent_id: 0,
  menu: lang === "hi" ? "हमारे बारे में" : "About us",
  page_title: lang === "hi" ? "हमारे बारे में" : "About us",
  page_url: "/pages/about-us",
  slug: "about-us",
  status: true
};

    const languageColumns =
      lang === "hi"
        ? {
            first_name: "hn_first_name",
            last_name: "hn_last_name",
            designation: "hn_designation",
            description: "hn_description",
            page_title: "hn_page_title",
            menu: "hn_menu",
          }
        : {
            first_name: "en_first_name",
            last_name: "en_last_name",
            designation: "en_designation",
            description: "description",
            page_title: "page_title",
            menu: "menu",
          };

    let documentdata = await managedirectory.findAll({
      attributes: [
        "id",
        [col(languageColumns.first_name), "first_name"],
        [col(languageColumns.last_name), "last_name"],
        [col(languageColumns.designation), "designation"],
        "phone",
        "email",
        "order",
        "img",
        "status",
        "createdAt",
      ],
      where: {
        status: true,
      },
      order: [["createdAt", "ASC"]],
    });
    documentdata = documentdata.sort((a, b) => a.order - b.order);
   

    let bread_crumb;
    if (lang == "en") {
      bread_crumb = [
        {
          label: "Management Directory",
          page_title: "Management Directory",
          page_url: "/management-directory",
          slug: "management-directory",
        },
      ];
    } else if (lang == "hn") {
      bread_crumb = [
        {
          label: "प्रबंधन निर्देशिका",
          page_title: "प्रबंधन निर्देशिका",
          page_url: "/प्रबंधन निर्देशिका",
          slug: "प्रबंधन निर्देशिका",
        },
      ];
    }

    let obj = {};
    obj["data"] = documentdata;
    // obj["bread_crumb"] = bread_crumb;

    if (documentdata.length > 0) {
      if (req.body.parent_id) {
        let sidemenudata = await menu.findAll({
          attributes: [
            "id",
            [col(languageColumns.menu), "menu"],
            [col(languageColumns.page_title), "page_title"],
            [col(languageColumns.description), "description"],
            "page_url",
            "slug",
            "status",
            "createdAt",
          ],

          where: {
            parent_id: req.body?.parent_id,
            status: true,
          },
          order: [["order", "ASC"]],
        });
        
        obj["sub_menu"] = sidemenudata?.length > 0 ? sidemenudata : [];
     
        
       let managementdata = sidemenudata.filter(
  (item) => item.id === req.body?.id
);

obj["bread_crumb"] = [
  {
    id: aboutUsBreadcrumb.id,
    parent_id: aboutUsBreadcrumb.parent_id,
    menu: aboutUsBreadcrumb.menu,
    page_title: aboutUsBreadcrumb.page_title,
    page_url: aboutUsBreadcrumb.page_url,
    slug: aboutUsBreadcrumb.slug,
  },
  ...managementdata.map((item) => ({
    id: item.id,
    parent_id: item.parent_id,
    menu: item.menu,
    page_title: item.page_title,
    page_url: item.page_url,
    slug: item.slug,
  }))
];

if(lang == "en"){
  obj["label"] = "Management Directory"
} else if(lang == "hn"){
  obj["label"] = "प्रबंधन निर्देशिका"
}
      }

    


      return Helper.response(
        "success",
        "data found Successfully",
        obj,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.log(error);

    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.getpublicorganizationaldata = async (req, res) => {
  try {
    let lang = req.headers.language == undefined ? req.headers?.Language : "en";
    const languageColumns =
      lang === "hn"
        ? {
            heading: "hn_heading",
            title: "hn_title",
            description: "hn_description",
          }
        : { heading: "heading", title: "title", description: "description" };

    const documentdata = (
      await organizational.findAll({
        attributes: [
          "id",
          [col(languageColumns.heading), "heading"],
          [col(languageColumns.title), "title"],
          [col(languageColumns.description), "description"],
          "status",
          "createdAt",
        ],
        where: {
          status: true,
        },

        order: [["createdAt", "ASC"]],
      })
    ).map((item) => item.toJSON());

    let bread_crumb;
    if (lang == "en") {
      bread_crumb = [
        {
          label: "Organizational Structure",
          page_title: "Organizational Structure",
          page_url: "/organizational-structure",
          slug: "organizational-structure",
        },
      ];
    } else if (lang == "hn") {
      bread_crumb = [
        {
          label: "संगठनात्मक संरचना",
          page_title: "संगठनात्मक संरचना",
          page_url: "/संगठनात्मक संरचना",
          slug: "संगठनात्मक संरचना",
        },
      ];
    }

    let obj = {};
    obj["data"] = documentdata;
    obj["bread_crumb"] = bread_crumb;

    if (documentdata.length > 0) {
      return Helper.response(
        "success",
        "Data found Successfully",
        documentdata,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.log(error);

    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.gethomeinfoabout = async (req, res) => {
  try {
    const lang = req.headers?.language == "hn" ? "hn" : "en";
    const languageColumns =
      lang === "hn" ? { title: "title_hn" } : { title: "title_en" };

    console.log("Language Columns:", languageColumns); // Debugging

    const documentdata = await information_about.findAll({
      where: {
        status: 1,
      },
      attributes: [
        "id",
        [col(languageColumns.title), "title"],
        "url",
        "color",
        "banner_image",
        "status",
        "createdAt",
      ],

      order: [["createdAt", "desc"]],
    });

    let bread_crumb;
    // if(lang=="en"){

    //   bread_crumb=  [
    //     {
    //       "label": "Events and Announcement",
    //       "page_title": "Events and Announcement",
    //       "page_url": "/event-and-announcement",
    //       "slug": "event-and-announcement",

    //     },
    //   ]

    // }else if(lang=="hn"){
    //   bread_crumb=  [
    //     {
    //       "label": "घटनाएँ और घोषणाएँ",
    //       "page_title": "घटनाएँ और घोषणाएँ",
    //       "page_url": "/event-and-announcement",
    //       "slug": "event-and-announcement",

    //     },
    //   ]
    // }

    let obj = {};
    obj["data"] = documentdata;
    // obj["bread_crumb"] = bread_crumb;

    if (documentdata.length > 0) {
      return Helper.response(
        "success",
        "Data found successfully",
        obj,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    console.log(error);
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};

exports.getpublicvipdocument = async (req, res) => {
  try {
    const lang = req.headers.language == "hi" ? "hn_name" : "name";
    const lang1 =
      req.headers.language == "hi" ? "hn_designation" : "designation";
    const documentdata = (
      await vip_doc.findAll({
        attributes: [
          "id",
          [lang, "name"],
          [lang1, "designation"],
          "order",
          "image",
          "status",
          "createdAt",
        ],
        where: {
          status: true,
        },
        order: [["createdAt", "ASC"]],
      })
    ).map((item) => item.toJSON());

    if (documentdata.length > 0) {
      const sortedData = documentdata.sort((a, b) => {
        if (a.order === b.order) {
          return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
        }
        return a.order - b.order; // Sort by order
      });

      return Helper.response(
        "success",
        "Data found successfully",
        sortedData,
        res,
        200,
      );
    } else {
      return Helper.response("failed", "No data found", null, res, 200);
    }
  } catch (error) {
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};
exports.getpublicfooterdata = async (req, res) => {
  try {
   const isHindi = req.headers.language === "hi";
     const footerData = {
      organization: isHindi
    ? {
        name: "उत्तर प्रदेश राज्य मुक्त विद्यालय बोर्ड (UPSOSB)",
        description:
          "उत्तर प्रदेश राज्य मुक्त विद्यालय बोर्ड (UPSOSB) उत्तर प्रदेश सरकार के माध्यमिक शिक्षा निदेशालय के तहत काम करने वाला एक ऑटोनॉमस संस्थान है।",
        logoTitle:
          "उत्तर प्रदेश राज्य मुक्त विद्यालय बोर्ड (UPSOSB) उत्तर प्रदेश सरकार के माध्यमिक शिक्षा निदेशालय के तहत काम करने वाला एक ऑटोनॉमस संस्थान है।",
      }
    : {
        name: "Uttar Pradesh State Open School Board (UPSOSB)",
        description:
          "Uttar Pradesh State Open School Board (UPSOSB) is an autonomous institution functioning under the Directorate of Secondary Education, Government of Uttar Pradesh.",
        logoTitle:
          "Uttar Pradesh State Open School Board (UPSOSB) is an autonomous institution functioning under the Directorate of Secondary Education, Government of Uttar Pradesh.",
      },
      titles: {
        quickLinks: "Quick Links",
        connectWithUs: "Connect us",
        importantLinks: "Important Links",
        reachUs: "Reach Us",
      },
      subHeadings: {
        name: "Name",
        designation: "Designation",
        phone: "Phone",
        email: "Email",
        lastUpdated: "Last Updated",
      },
      quickLinks: [
         {
    name: "Content Archival Policy",
    slug: "/links/content-archival-policy",
  },
  {
    name: "Content Review Policy",
    slug: "/links/content-review-policy",
  },
     { name: "CMAP Policy", slug: "/links/content-contribution-moderation-policy" },
 

        { name: "Copyright Policy", slug: "/links/copyright-policy" },
        { name: "Privacy Policy", slug: "/links/privacy-policy" },
        { name: "Hyper Linking Policy", slug: "/links/hyperlinking-policy" },
        { name: "Terms and Conditions", slug: "/links/terms-and-conditions" },
          {
    name: "Contingency Management Plan",
    slug: "/links/contingency-management-plan",
  },
   {
    name: "Website Monitoring Plan",
    slug: "/links/website-monitoring-plan",
  },
        // { name: "RTI", slug: "https://rtionline.up.gov.in/" },
        // { name: "Employee Corner", slug: "/links/employee-corner" },
        { name: "Site Security", slug: "/links/site-security" },
        { name: "Help Desk", slug: "/links/help-desk" },
        { name: "Contact Us", slug: "/pages/contact-us" },
        { name: "Feedback", slug: "/feedback" },
        { name: "FAQs", slug: "/faq" },
        { name: "Grievance", slug: "/grievance" },
        // { name: "Archives", slug: "/archive" },
        { name: "Web Information Manager", slug: "/links/web-information-manager" },
        // { name: "Admin Login", slug: "/admin/auth-login" },
      ],
      connectWithUs: {
        name: "Anuj Dixit",
        designation: "AD - D&P",
        phone: "7839065xxx",
        email: "addoncxxb@gmail.com",
      },
      importantLinks: [
        { name: "National Portal", slug: "https://www.india.gov.in/" },
        { name: "R.T.I", slug: "https://rtionline.up.gov.in/" },
        //  { name: "CMAP Policy", slug: "/links/content-contribution-moderation-policy" },
        // { name: "Download Section", slug: "#" },
        // { name: "Reports", slug: "#" },
        // { name: "Audio Gallery", slug: "audio-gallery" },
        // { name: "Proud Learners", slug: "#" },
        { name: "Student Login", slug: "/student-login" },
        { name: "Nodal Login", slug: "/nodal-login" },
        {
          name: "IT Admin Login",
          slug: "/it-admin-login",
        },
        {
          name: "State Login",
          slug: "/state-login",
        },
        {
          name: "JD Login",
          slug: "/jd-login",
        },
        {
          name: "DIOS Login",
          slug: "/dios-login",
        },
      ],
      governmentWebsite: "www.india.gov.in",
      reachUs: {
        address: "53,Mahatma Gandhi marg, Prayagraj, UP.",
        phone: "(91)-0522-2638898",
        // emails: ["patracharshikshasansthan@gmail.com"],
        emails: ["upsosb@gmail.com"],
      },
       lastUpdated: "14/July/2026",
      copyrightYear: new Date().getFullYear(),
      poweredBy: "Quaere E Technologies",
      text_copyright: "Copyright",
      text_reserved: "All rights reserved.",
      text_powered: "Powered By",

    };

    return Helper.response(
      "success",
      "Data found successfully",
      footerData,
      res,
      200
    );
  } catch (error) {
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200
    );
  }
};

exports.getAboutBannerImage = async (req, res) => {
  try {
    let data
    if (req.headers.language == "hi") {
      data = {
        heading: "ABOUT US",
        // title: "पत्राचार शिक्षा संस्थान, प्रयागराज",
        title: "उत्तर प्रदेश राज्य मुक्त विद्यालय बोर्ड (यूपीएसओएसबी), प्रयागराज",
        // sub_title:
        // "Welcome to the Uttar Pradesh State Open School Board (UPSOSB), an initiative by the Government of Uttar Pradesh established under the UPSOSB Act, 2008 (Act No. 27). The Board provides quality open and distance education to learners unable to attend formal schools due to social, economic, or personal reasons.",
        sub_title:
          "उत्तर प्रदेश शिक्षा विभाग की यह प्रमुख इकाई व्यक्तिगत परीक्षार्थियों को गुणवत्तापूर्ण शिक्षा प्रदान करती है। हम मानविकी, विज्ञान और वाणिज्य वर्गों में कक्षा 11 और 12 हेतु दो वर्षीय तथा केवल कक्षा 12 हेतु एक वर्षीय पत्राचार पाठ्यक्रम संचालित करते हैं, ताकि हर छात्र लचीले ढंग से अपनी पढ़ाई पूरी कर सके।",
        slug: "pages/about-us",
        button_text: "READ MORE",
        image: "about-banner.jpeg",
      };
    } else {
      data = {
        heading: "ABOUT US",
        title: "Uttar Pradesh State Open School Board (UPSOSB), Prayagraj ",
        // sub_title:
        // "Welcome to the Uttar Pradesh State Open School Board (UPSOSB), an initiative by the Government of Uttar Pradesh established under the UPSOSB Act, 2008 (Act No. 27). The Board provides quality open and distance education to learners unable to attend formal schools due to social, economic, or personal reasons.",
        sub_title:
          "A key wing of the U.P. Education Department, we provide quality education to private students. We offer 1-year (Class 12) and 2-year (Class 11 & 12) correspondence courses in Arts, Science, and Commerce to help students complete their schooling flexibly.",
        slug: "pages/about-us",
        button_text: "READ MORE",
        image: "about-banner.jpeg",
      };
    }

    if (data) {
      return Helper.response(
        "success",
        "data found Successfully",
        data,
        res,
        200,
      );
    } else {
      return Helper.response("failed", data, null, res, 200);
    }
  } catch (error) {
    return Helper.response(
      "failed",
      error.message || "Something went wrong",
      {},
      res,
      200,
    );
  }
};
