const Helper = require("../../helper/helper");
const { Op } = require("sequelize");
const DeviceLocationLog = require("../../models/device_location_logs");
const empPersonal = require("../../models/empPersonal");
// exports.trackLocation = async (req, res) => {
//   try {
//     const {
//       coords,
//       timestamp,
//       mode,
//       Deviceid,
//       deviceOs,
//       network_mode,
//       locations,
//       bulkData,
//     } = req.body;

//     // console.log(req.body, "body data");

//     const tenantId = req?.users?.tenantId || null;
//     const branchId = req?.users?.branchId || null;
//     const employeeId = req?.users?.id || null;

//     /* ---------------- VALIDATION ---------------- */

//     if (!branchId || branchId === "null") {
//       return Helper.response(false, "branchId is required!", {}, res, 200);
//     }

//     if (!tenantId) {
//       return Helper.response(false, "Tenant ID is required", {}, res, 400);
//     }

//     if (!Deviceid && !bulkData?.length && !locations?.length) {
//       return Helper.response(false, "Device info required", {}, res, 400);
//     }

  

//     const bulkArray = locations || bulkData;

//     if (
//       (network_mode == "offline" ||
//         bulkArray?.[0]?.mode == "offline" ||
//         bulkArray?.[0]?.network_mode == "offline") &&
//       Array.isArray(bulkArray)
//     ) {
//       const bulkInsertData = [];

//       for (const item of bulkArray) {
//         if (!item.coords?.latitude || !item.coords?.longitude) continue;

//         bulkInsertData.push({
//           device_id: item.Deviceid || Deviceid,
//           tenantId,
//           branchId,
//           employeeId,
//           device_os: item.deviceOs || deviceOs,
//           latitude: item.coords.latitude,
//           longitude: item.coords.longitude,
//           altitude: item.coords.altitude || null,
//           accuracy: item.coords.accuracy || null,
//           altitude_accuracy: item.coords.altitudeAccuracy || null,
//           heading: item.coords.heading || null,
//           speed: item.coords.speed || null,
//           location_type: "normal",
//           mode: item.mode || "background",
//           network_mode: item.network_mode || "offline",
//           tracked_at: new Date(item.timestamp),
//         });
//       }

//       if (!bulkInsertData.length) {
//         return Helper.response(false, "No valid locations", {}, res, 400);
//       }

//       const chunkSize = 500;

//       for (let i = 0; i < bulkInsertData.length; i += chunkSize) {
//         await DeviceLocationLog.bulkCreate(
//           bulkInsertData.slice(i, i + chunkSize),
//         );
//       }

//       return Helper.response(
//         true,
//         "Offline locations synced successfully",
//         { total: bulkInsertData.length },
//         res,
//         200,
//       );
//     }


//     if (!coords || !coords.latitude || !coords.longitude || !timestamp) {
//       return Helper.response(false, "Invalid payload", {}, res, 400);
//     }

//     // let locationType = "normal";

//     // /* 🔹 Date Filter (ONLY TODAY) */
//     // const startOfDay = new Date();
//     // startOfDay.setHours(0, 0, 0, 0);

//     // const endOfDay = new Date();
//     // endOfDay.setHours(23, 59, 59, 999);

//     // let visit_place = null;
//     // let purpose = null;

//     // /* 🔹 Check pinned location */
//     // const pinnedLocation = await DeviceLocationLog.findOne({
//     //   where: {
//     //     employeeId,
//     //     location_type: "pinned",
//     //     tracked_at: {
//     //       [Op.between]: [startOfDay, endOfDay],
//     //     },
//     //   },
//     //   order: [["tracked_at", "DESC"]],
//     // });

//     // let address;

//     // if (pinnedLocation) {
//     //   const distance = Helper.getDistanceMeters(
//     //     coords.latitude,
//     //     coords.longitude,
//     //     pinnedLocation.latitude,
//     //     pinnedLocation.longitude,
//     //   );

//     //   if (distance <= 50) {
//     //     locationType = "pinned";
//     //     visit_place = pinnedLocation?.visit_place;
//     //     purpose = pinnedLocation?.purpose;
//     //   }
//     // }

//     // try {
//     //   address = await Helper.getAddressFromGlobalVTS(
//     //     coords.latitude,
//     //     coords.longitude,
//     //   );
//     // } catch (err) {
//     //   console.log("Address fetch failed:", err.message);
//     // }

//     // // if (existingLog) {
//     // //   return Helper.response(
//     // //     true,
//     // //     "Location already tracked",
//     // //     existingLog,
//     // //     res,
//     // //     200
//     // //   );
//     // // }

//     // const location = await DeviceLocationLog.create({
//     //   device_id: Deviceid,
//     //   tenantId,
//     //   branchId,
//     //   employeeId,
//     //   device_os: deviceOs,
//     //   latitude: coords.latitude,
//     //   longitude: coords.longitude,
//     //   altitude: coords.altitude || null,
//     //   accuracy: coords.accuracy || null,
//     //   altitude_accuracy: coords.altitudeAccuracy || null,
//     //   heading: coords.heading || null,
//     //   speed: coords.speed || null,
//     //   purpose: purpose || null,
//     //   visit_place: visit_place || null,
//     //   location_type: locationType,
//     //   mode: mode || "foreground",
//     //   network_mode: network_mode || "online",
//     //   tracked_at: new Date(timestamp),
//     //   address: address?.full_address ?? null,
//     // });

//     let locationType = "normal";
//     let address;
//     /* 🔹 Date Filter (ONLY TODAY) */
//     const startOfDay = new Date();
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date();
//     endOfDay.setHours(23, 59, 59, 999);

//     let visit_place = null;
//     let purpose = null;

//     /* 🔹 1. Get ANY previous pinned location */
//     const previousPinned = await DeviceLocationLog.findOne({
//       where: {
//         employeeId,
//         location_type: "pinned",
//         visit_place: { [Op.ne]: null },
//       },
//       order: [["tracked_at", "DESC"]],
//     });

//     /* 🔹 2. Check if already pinned today */
//     const todayPinned = await DeviceLocationLog.findOne({
//       where: {
//         employeeId,
//         location_type: "pinned",
//         tracked_at: {
//           [Op.between]: [startOfDay, endOfDay],
//         },
//       },
//     });

//     /* 🔹 3. Apply logic */
//     if (previousPinned) {
//       const distance = Helper.getDistanceMeters(
//         coords.latitude,
//         coords.longitude,
//         previousPinned.latitude,
//         previousPinned.longitude,
//       );

//       if (distance <= 50) {
//         if (!todayPinned) {
//           locationType = "pinned";
//           visit_place = previousPinned.visit_place;
//           purpose = previousPinned.purpose;
//         } else {
//           // already pinned today → keep normal
//           locationType = "normal";
//         }
//       }

//       address = await Helper.getAddressFromGlobalVTS(
//         coords.latitude,
//         coords.longitude,
//       );
//     }

//     const location = await DeviceLocationLog.create({
//       device_id: Deviceid,
//       tenantId,
//       branchId,
//       employeeId,
//       device_os: deviceOs,
//       latitude: coords.latitude,
//       longitude: coords.longitude,
//       altitude: coords.altitude || null,
//       accuracy: coords.accuracy || null,
//       altitude_accuracy: coords.altitudeAccuracy || null,
//       heading: coords.heading || null,
//       speed: coords.speed || null,
//       purpose: purpose || null,
//       visit_place: visit_place || null,
//       location_type: locationType,
//       mode: mode || "foreground",
//       network_mode: network_mode || "online",
//       tracked_at: new Date(timestamp),
//       address: address?.full_address ?? null,
//     });

//     return Helper.response(
//       true,
//       "Location tracked successfully",
//       location,
//       res,
//       200,
//     );
//   } catch (error) {
//     console.error("Location tracking error:", error);
//     return Helper.response(false, error?.message, {}, res, 500);
//   }
// };

exports.trackLocation = async (req, res) => {
  try {
    const {
      coords,
      timestamp,
      mode,
      Deviceid,
      deviceOs,
      network_mode,
      locations,
      bulkData,
    } = req.body;

    // console.log(req.body, "body data");

    const tenantId = req?.users?.tenantId || null;
    const branchId = req?.users?.branchId || null;
    const employeeId = req?.users?.id || null;

    /* ---------------- VALIDATION ---------------- */

    if (!branchId || branchId === "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", {}, res, 400);
    }

    if (!Deviceid && !bulkData?.length && !locations?.length) {
      return Helper.response(false, "Device info required", {}, res, 400);
    }

  

    const bulkArray = locations || bulkData;

    if (
      (network_mode == "offline" ||
        bulkArray?.[0]?.mode == "offline" ||
        bulkArray?.[0]?.network_mode == "offline") &&
      Array.isArray(bulkArray)
    ) {
      const bulkInsertData = [];

      for (const item of bulkArray) {
        if (!item.coords?.latitude || !item.coords?.longitude) continue;

        bulkInsertData.push({
          device_id: item.Deviceid || Deviceid,
          tenantId,
          branchId,
          employeeId,
          device_os: item.deviceOs || deviceOs,
          latitude: item.coords.latitude,
          longitude: item.coords.longitude,
          altitude: item.coords.altitude || null,
          accuracy: item.coords.accuracy || null,
          altitude_accuracy: item.coords.altitudeAccuracy || null,
          heading: item.coords.heading || null,
          speed: item.coords.speed || null,
          location_type: "normal",
          mode: item.mode || "background",
          network_mode: item.network_mode || "offline",
          tracked_at: new Date(item.timestamp),
        });
      }

      if (!bulkInsertData.length) {
        return Helper.response(false, "No valid locations", {}, res, 400);
      }

      const chunkSize = 500;

      for (let i = 0; i < bulkInsertData.length; i += chunkSize) {
        await DeviceLocationLog.bulkCreate(
          bulkInsertData.slice(i, i + chunkSize),
        );
      }

      return Helper.response(
        true,
        "Offline locations synced successfully",
        { total: bulkInsertData.length },
        res,
        200,
      );
    }


    if (!coords || !coords.latitude || !coords.longitude || !timestamp) {
      return Helper.response(false, "Invalid payload", {}, res, 400);
    }

    // let locationType = "normal";

    // /* 🔹 Date Filter (ONLY TODAY) */
    // const startOfDay = new Date();
    // startOfDay.setHours(0, 0, 0, 0);

    // const endOfDay = new Date();
    // endOfDay.setHours(23, 59, 59, 999);

    // let visit_place = null;
    // let purpose = null;

    // /* 🔹 Check pinned location */
    // const pinnedLocation = await DeviceLocationLog.findOne({
    //   where: {
    //     employeeId,
    //     location_type: "pinned",
    //     tracked_at: {
    //       [Op.between]: [startOfDay, endOfDay],
    //     },
    //   },
    //   order: [["tracked_at", "DESC"]],
    // });

    // let address;

    // if (pinnedLocation) {
    //   const distance = Helper.getDistanceMeters(
    //     coords.latitude,
    //     coords.longitude,
    //     pinnedLocation.latitude,
    //     pinnedLocation.longitude,
    //   );

    //   if (distance <= 50) {
    //     locationType = "pinned";
    //     visit_place = pinnedLocation?.visit_place;
    //     purpose = pinnedLocation?.purpose;
    //   }
    // }

    // try {
    //   address = await Helper.getAddressFromGlobalVTS(
    //     coords.latitude,
    //     coords.longitude,
    //   );
    // } catch (err) {
    //   console.log("Address fetch failed:", err.message);
    // }

    // // if (existingLog) {
    // //   return Helper.response(
    // //     true,
    // //     "Location already tracked",
    // //     existingLog,
    // //     res,
    // //     200
    // //   );
    // // }

    // const location = await DeviceLocationLog.create({
    //   device_id: Deviceid,
    //   tenantId,
    //   branchId,
    //   employeeId,
    //   device_os: deviceOs,
    //   latitude: coords.latitude,
    //   longitude: coords.longitude,
    //   altitude: coords.altitude || null,
    //   accuracy: coords.accuracy || null,
    //   altitude_accuracy: coords.altitudeAccuracy || null,
    //   heading: coords.heading || null,
    //   speed: coords.speed || null,
    //   purpose: purpose || null,
    //   visit_place: visit_place || null,
    //   location_type: locationType,
    //   mode: mode || "foreground",
    //   network_mode: network_mode || "online",
    //   tracked_at: new Date(timestamp),
    //   address: address?.full_address ?? null,
    // });

    let locationType = "normal";
    let address;
    let visit_place = null;
    let purpose = null;

    /* 🔹 1. Get ANY previous pinned location */
    const previousPinned = await DeviceLocationLog.findOne({
      where: {
        employeeId,
        location_type: "pinned",
        visit_place: { [Op.ne]: null },
      },
      order: [["tracked_at", "DESC"]],
    });

    /* 🔹 2. Check if already pinned within the last 1 hour with same visit_place & purpose */
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    /* 🔹 3. Apply logic */
    if (previousPinned) {
      const distance = Helper.getDistanceMeters(
        coords.latitude,
        coords.longitude,
        previousPinned.latitude,
        previousPinned.longitude,
      );

      if (distance <= 50) {
        const recentPinned = await DeviceLocationLog.findOne({
          where: {
            employeeId,
            location_type: "pinned",
            visit_place: previousPinned.visit_place,
            purpose: previousPinned.purpose,
            tracked_at: {
              [Op.gte]: oneHourAgo,
            },
          },
          order: [["tracked_at", "DESC"]],
        });

        if (!recentPinned) {
          locationType = "pinned";
          visit_place = previousPinned.visit_place;
          purpose = previousPinned.purpose;
        } else {
          // same visit_place & purpose pinned within last 1 hour → keep normal
          locationType = "normal";
        }
      }

      address = await Helper.getAddressFromGlobalVTS(
        coords.latitude,
        coords.longitude,
      );
    }

    const location = await DeviceLocationLog.create({
      device_id: Deviceid,
      tenantId,
      branchId,
      employeeId,
      device_os: deviceOs,
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude || null,
      accuracy: coords.accuracy || null,
      altitude_accuracy: coords.altitudeAccuracy || null,
      heading: coords.heading || null,
      speed: coords.speed || null,
      purpose: purpose || null,
      visit_place: visit_place || null,
      location_type: locationType,
      mode: mode || "foreground",
      network_mode: network_mode || "online",
      tracked_at: new Date(timestamp),
      address: address?.full_address ?? null,
    });

    return Helper.response(
      true,
      "Location tracked successfully",
      location,
      res,
      200,
    );
  } catch (error) {
    console.error("Location tracking error:", error);
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.PinnedtrackLocation = async (req, res) => {
  try {
    const {
      coords,
      timestamp,
      mode,
      Deviceid,
      deviceOs,
      remark,
      purpose,
      visit_place,
      network_mode,
    } = req.body;
    const tenantId = req?.users?.tenantId || null;
    const branchId = req?.users?.branchId || null;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", {}, res, 400);
    }

    if (
      !Deviceid ||
      !deviceOs ||
      !coords ||
      !coords.latitude ||
      !coords.longitude ||
      !timestamp
    ) {
      return Helper.response(false, "Invalid payload", {}, res, 400);
    }
    console.log(req.body, "body data");

    const existingLog = await DeviceLocationLog.findOne({
      where: {
        device_id: Deviceid,
        tenantId: req?.users?.tenantId || null,
        branchId: req?.users?.branchId || null,
        employeeId: req?.users?.id || null,
        device_os: deviceOs,
        location_type: "pinned",
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude || null,
        accuracy: coords.accuracy || null,
        altitude_accuracy: coords.altitudeAccuracy || null,
        heading: coords.heading || null,
        speed: coords.speed || null,
        mode: mode || null,
        tracked_at: new Date(timestamp),
      },
      order: [["tracked_at", "DESC"]],
    });

    // if (existingLog) {
    //   return Helper.response(
    //     true,
    //     "Location already tracked",
    //     existingLog,
    //     res,
    //     200
    //   );
    // }

    const address = await Helper.getAddressFromGlobalVTS(
      coords.latitude,
      coords.longitude,
    );

    let location;
    if (!existingLog) {
      location = await DeviceLocationLog.create({
        device_id: Deviceid,
        tenantId: req?.users?.tenantId || null,
        branchId: req?.users?.branchId || null,
        employeeId: req?.users?.id || null,
        device_os: deviceOs,
        visit_place: visit_place ?? null,
        purpose: purpose ?? null,
        remark: remark ?? null,
        network_mode: network_mode ?? "online",
        location_type: "pinned",
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude || null,
        accuracy: coords.accuracy || null,
        altitude_accuracy: coords.altitudeAccuracy || null,
        heading: coords.heading || null,
        speed: coords.speed || null,
        mode: mode || "foreground",
        tracked_at: new Date(timestamp),
        address: address?.full_address ?? null,
      });
    }

    return Helper.response(
      true,
      "Location tracked successfully",
      location,
      res,
      200,
    );
  } catch (error) {
    console.error("Location tracking error:", error);
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.getLatestLocation = async (req, res) => {
  try {
    const employeeId = req.users?.id;
    const branchId = req?.users?.branchId;
    if (!branchId || branchId == "null") {
      return Helper.response(false, "Branch Id is required", {}, res, 200);
    }
    const location = await DeviceLocationLog.findOne({
      where: { employeeId: employeeId, branchId },
      order: [["tracked_at", "DESC"]],
    });

    if (!location) {
      return Helper.response(false, "No location found", {}, res, 404);
    }

    return Helper.response(true, "Latest location fetched", location, res, 200);
  } catch (error) {
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.getLocationHistory = async (req, res) => {
  try {
    let { employeeId } = req.body;
    const branchId = req?.users?.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "Branch Id is required", {}, res, 400);
    }

    if (!employeeId) {
      return Helper.response(false, "Employee Id is required", {}, res, 400);
    }
    // const todayStart = new Date();
    // todayStart.setHours(0, 0, 0, 0);

    // const todayEnd = new Date();
    // todayEnd.setHours(23, 59, 59, 999);

    // start_date = start_date ? new Date(start_date) : todayStart;
    // end_date = end_date ? new Date(end_date) : todayEnd;
    let whereCondition = {
      branchId,
      employeeId,
    };

    // let { start_date, end_date ,end_time,start_time} = req.body;

    // // Default to today if not provided
    // const todayStart = new Date();
    // todayStart.setHours(0, 0, 0, 0);

    // const todayEnd = new Date();
    // todayEnd.setHours(23, 59, 59, 999);

    // // Normalize start date
    // if (start_date) {
    //   start_date = new Date(start_date);
    //   start_date.setHours(0, 0, 0, 0);
    // } else {
    //   start_date = todayStart;
    // }

    // // Normalize end date
    // if (end_date) {
    //   end_date = new Date(end_date);
    //   end_date.setHours(23, 59, 59, 999);
    // } else {
    //   end_date = todayEnd;
    // }
    // console.log(start_date, end_date);

    // whereCondition.tracked_at = {
    //   [Op.between]: [new Date(start_date), new Date(end_date)],
    // };

    let { start_date, end_date, start_time, end_time } = req.body;

    // Default today
    const today = new Date();
    const todayDate = today.toISOString().split("T")[0];

    // If no date passed
    start_date = start_date || todayDate;
    end_date = end_date || todayDate;

    // If no time passed
    start_time = start_time || "00:00:00";
    end_time = end_time || "23:59:59";

    // Create full datetime
    const startDateTime = new Date(`${start_date} ${start_time}`);
    const endDateTime = new Date(`${end_date} ${end_time}`);

    console.log("Start:", startDateTime);
    console.log("End:", endDateTime);

    whereCondition.tracked_at = {
      [Op.between]: [startDateTime, endDateTime],
    };

    const locations = await DeviceLocationLog.findAll({
      attributes: [
        "latitude",
        "longitude",
        "altitude",
        "accuracy",
        "heading",
        "speed",
        "tracked_at",
        "device_id",
        "device_os",
        "location_type",
        "visit_place",
        "remark",
        "purpose",
        "mode",
        "address",
      ],
      where: whereCondition,
      order: [["tracked_at", "ASC"]],
      raw: true,
    });

    if (locations.length == 0) {
      return Helper.response(false, "No Data Found", {}, res, 200);
    }

    const staticLocationData = locations.map((loc) => ({
     
      coords: {
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        altitude: Number(loc.altitude ?? 0),
        accuracy: Number(loc.accuracy ?? 100),
        altitudeAccuracy: 100,
        heading: Number(loc.heading ?? 0),
        speed: Number(loc.speed ?? 0),
      },
      timestamp: new Date(loc.tracked_at).getTime(),
      mode: loc.mode || "foreground",
      Deviceid: loc.device_id || "unknown",
      deviceOs: loc.device_os || "A",
      location_type: loc.location_type || "A",
      visit_place: loc.visit_place || null,
      remark: loc.remark || null,
      purpose: loc.purpose || null,
      address: loc.address || null,
    }));

    return Helper.response(
      true,
      "Employee location history",

      staticLocationData, // 🔥 EXACT SAME FORMAT AS FRONTEND
      res,
      200,
    );
  } catch (error) {
    console.error("Location history error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getliveLocationHistory = async (req, res) => {
  try {
    let { employeeId } = req.body;
    const branchId = req?.users?.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "Branch Id is required", {}, res, 400);
    }

    if (!employeeId) {
      return Helper.response(false, "Employee Id is required", {}, res, 400);
    }
    // const todayStart = new Date();
    // todayStart.setHours(0, 0, 0, 0);

    // const todayEnd = new Date();
    // todayEnd.setHours(23, 59, 59, 999);

    // start_date = start_date ? new Date(start_date) : todayStart;
    // end_date = end_date ? new Date(end_date) : todayEnd;
    let whereCondition = {
      branchId,
      employeeId,
    };

    // if (start_date && end_date) {
    //   whereCondition.tracked_at = {
    //     [Op.between]: [
    //       start_date,
    //       end_date,
    //     ],
    //   };
    // }

    const locations = await DeviceLocationLog.findAll({
      attributes: [
        "latitude",
        "longitude",
        "altitude",
        "accuracy",
        "heading",
        "speed",
        "tracked_at",
        "device_id",
        "device_os",
        "mode",
      ],
      where: whereCondition,
      order: [["tracked_at", "ASC"]],
      raw: true,
    });

    if (locations.length == 0) {
      return Helper.response(false, "No Data Found", {}, res, 200);
    }

    const staticLocationData = locations.map((loc) => ({
      coords: {
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        altitude: Number(loc.altitude ?? 0),
        accuracy: Number(loc.accuracy ?? 100),
        altitudeAccuracy: 100,
        heading: Number(loc.heading ?? 0),
        speed: Number(loc.speed ?? 0),
      },
      timestamp: new Date(loc.tracked_at).getTime(),
      mode: loc.mode || "foreground",
      Deviceid: loc.device_id || "unknown",
      deviceOs: loc.device_os || "A",
    }));

    return Helper.response(
      true,
      "Employee location history",

      staticLocationData, // 🔥 EXACT SAME FORMAT AS FRONTEND
      res,
      200,
    );
  } catch (error) {
    console.error("Location history error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getempLocationHistory = async (req, res) => {
  try {
    const employeeId = req.body?.id;

    if (!employeeId) {
      return Helper.response(false, "employeeId is required", {}, res, 400);
    }
    const branchId = req?.users?.branchId;
    if (!branchId || branchId == "null") {
      return Helper.response(false, "Branch Id is required", {}, res, 200);
    }
    let { start_date, end_date } = req.body;

    // Default to today if not provided
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Normalize start date
    if (start_date) {
      start_date = new Date(start_date);
      start_date.setHours(0, 0, 0, 0);
    } else {
      start_date = todayStart;
    }

    // Normalize end date
    if (end_date) {
      end_date = new Date(end_date);
      end_date.setHours(23, 59, 59, 999);
    } else {
      end_date = todayEnd;
    }
    console.log(start_date, end_date);
    let whereCondition = {
      branchId,
      employeeId,
    };

    whereCondition.tracked_at = {
      [Op.between]: [new Date(start_date), new Date(end_date)],
    };

    const locations = await DeviceLocationLog.findAll({
      attributes: [
        "id",
        "latitude",
        "longitude",
        "altitude",
        "accuracy",
        "heading",
        "speed",
        "location_type",
        "tracked_at",
        "device_id",
        "device_os",
        "mode",
      ],
      where: whereCondition,
      order: [["tracked_at", "ASC"]],
      raw: true,
    });

    if (locations.length == 0) {
      return Helper.response(false, "No Data Found", {}, res, 200);
    }

    const staticLocationData = locations.map((loc) => ({
      coords: {
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        altitude: Number(loc.altitude ?? 0),
        accuracy: Number(loc.accuracy ?? 100),
        altitudeAccuracy: 100,
        heading: Number(loc.heading ?? 0),
        speed: Number(loc.speed ?? 0),
      },
      timestamp: new Date(loc.tracked_at).getTime(),
      mode: loc.mode || "foreground",
      id: loc.id || "foreground",
      Deviceid: loc.device_id || "unknown",
      deviceOs: loc.device_os || "A",
      location_type: loc.location_type || "A",
    }));

    return Helper.response(
      true,
      "Employee location history",

      staticLocationData,
      res,
      200,
    );
  } catch (error) {
    console.error("Location history error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

// exports.getLocationHistory = async (req, res) => {
//   try {
//     const { employeeId } = req.body;

//     if (!employeeId) {
//       return Helper.response(false, "employeeId is required", {}, res, 400);
//     }

//     const locations = await DeviceLocationLog.findAll({
//       attributes: [
//         "employeeId",
//         "latitude",
//         "longitude",
//         "altitude",
//         "accuracy",
//         "heading",
//         "speed",
//         "tracked_at",
//         "device_id",
//         "device_os",
//         "mode"
//       ],
//       where: { employeeId },
//       order: [["tracked_at", "ASC"]],
//       raw: true
//     });

//     // Employee info
//     const employee = await empPersonal.findOne({
//       where: { id: employeeId },
//       attributes: ["firstName", "lastName", "empCode"],
//       raw: true
//     });

//     //  FORMAT DATA FOR FRONTEND
//     const staticLocationData = locations.map(loc => ({
//       coords: {
//         latitude: Number(loc.latitude),
//         longitude: Number(loc.longitude),
//         altitude: Number(loc.altitude || 0),
//         accuracy: Number(loc.accuracy || 0),
//         altitudeAccuracy: 100,
//         heading: Number(loc.heading || 0),
//         speed: Number(loc.speed || 0)
//       },
//       timestamp: new Date(loc.tracked_at).getTime(),
//       mode: loc.mode || "foreground",
//       Deviceid: loc.device_id || "unknown",
//       deviceOs: loc.device_os || "A"
//     }));

//     return Helper.response(
//       true,
//       "Employee location history",
//       {
//         employeeId,
//         employeeName: employee
//           ? `${employee.firstName} ${employee.lastName}`
//           : null,
//         empCode: employee?.empCode || null,
//         staticLocationData
//       },
//       res,
//       200
//     );

//   } catch (error) {
//     console.error("Location history error:", error);
//     return Helper.response(false, error.message, {}, res, 500);
//   }
// };

// exports.getLocationHistory = async (req, res) => {
//   try {

//     // const locations = await DeviceLocationLog.findAll({
//     //   order: [["tracked_at", "DESC"]],
//     //   raw:true
//     // });
//    const {employeeId}=req.body
//     const locations = await DeviceLocationLog.findAll({
//       attributes: [
//         "employeeId",
//         "latitude",
//         "longitude",
//         "tracked_at"
//       ],
//       order: [
//         ["employeeId", "ASC"],
//         ["tracked_at", "ASC"]
//       ],
//       where:{
// employeeId
//       },
//       raw: true
//     });

//     // Group by employeeId
//     const grouped = {};
//     for (const loc of locations) {
//       if (!grouped[loc.employeeId]) {
//         grouped[loc.employeeId] = [];
//       }
//       const employeeData = await empPersonal.findOne({
//         where: { id: loc.employeeId },
//         attributes: ['firstName', 'lastName', 'empCode'],
//         raw: true
//         });
//         loc.employeeName = employeeData ? `${employeeData?.firstName} ${employeeData?.lastName}` : null;
//       grouped[loc.employeeId].push(loc);
//     }

//     return Helper.response(
//       true,
//       "Employee-wise location history",
//       grouped,
//       res,
//       200
//     );

//     // return Helper.response(true, "Location history fetched", locations, res, 200);
//   } catch (error) {
//     console.log("error:",error);

//     return Helper.response(false, error?.message, {}, res, 500);
//   }
// };
exports.getActiveLocationEmp = async (req, res) => {
  try {
    const branchId = req?.users?.branchId;
    if (!branchId || branchId == "null") {
      return Helper.response(false, "Branch Id is required", {}, res, 200);
    }
    const locations = await empPersonal.findAll({
      where: { isLocation: true, branchId },
      // attributes: ['id', 'firstName', 'lastName', 'empCode'],
      raw: true,
    });
    return Helper.response(
      true,
      "Active location employees fetched",
      locations,
      res,
      200,
    );
  } catch (error) {
    return Helper.response(false, error?.message, {}, res, 500);
  }
};
exports.getappActiveLocationEmp = async (req, res) => {
  try {
    const branchId = req?.users?.branchId;

    if (!branchId || branchId === "null") {
      return Helper.response(false, "Branch Id is required", {}, res, 200);
    }

    // get employees with location enabled
    const employees = await empPersonal.findAll({
      where: {
        isLocation: true,
        branchId,
      },
      raw: true,
    });

    // today's start and end
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // get today's check-in locations
    const todayLocations = await DeviceLocationLog.findAll({
      where: {
        location_type: "attendance_checkIn",
        tracked_at: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
      raw: true,
    });

    // map employeeId -> location
    const locationMap = {};

    todayLocations.forEach((loc) => {
      locationMap[loc.employeeId] = loc;
    });

    const data = await Promise.all(
      employees.map(async (emp) => {
        const location = locationMap[emp.id];

        let address = null;

        if (location) {
          const addr = await Helper.getAddressFromGlobalVTS(
            location.latitude,
            location.longitude,
          );

          address = addr?.full_address || null;
        }

        return {
          ...emp,
          user_location: address,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          tracked_at: location?.tracked_at || null,
        };
      }),
    );

    return Helper.response(
      true,
      "Active location employees fetched",
      data,
      res,
      200,
    );
  } catch (error) {
    console.log(error);

    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.listVistData = async (req, res) => {
  try {
    let { date, visit_place, with_remark } = req.body;

    let filterDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));

    let whereCondition = {
      tracked_at: {
        [Op.between]: [startOfDay, endOfDay],
      },
      location_type: "pinned",
      employeeId:req.users?.id
    };

    if (visit_place) {
      whereCondition.visit_place = {
        [Op.like]: `%${visit_place}%`,
      };
    }

    if (with_remark == "Y") {
      whereCondition.remark = {
        [Op.ne]: null,
      };
    }
    if (with_remark == "N") {
      whereCondition.remark = {
        [Op.eq]: null,
      };
    }

    const data = await DeviceLocationLog.findAll({
      where: whereCondition,
      order: [["tracked_at", "DESC"]],
    });

    return Helper.response(true, "Data fetched successfully", data, res, 200);
  } catch (error) {
    console.log(error);
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.updateTrackRemark = async (req, res) => {
  try {
    const { id, remark } = req.body;

    if (!id) {
      return Helper.response(false, "Id is required", {}, res, 400);
    }

    if (!remark) {
      return Helper.response(false, "Remark is required", {}, res, 400);
    }

    const existsData = await DeviceLocationLog.findOne({
      where: { id },
    });

    if (!existsData) {
      return Helper.response(false, "No Data Found", {}, res, 404);
    }

    let updatePayload = {};

    if (remark !== undefined) updatePayload.remark = remark;
    // if (feedback !== undefined) updatePayload.feedback = feedback;

    await DeviceLocationLog.update(updatePayload, {
      where: { id },
    });

    const updatedData = await DeviceLocationLog.findOne({
      where: { id },
    });

    return Helper.response(
      true,
      "Data Updated Successfully",
      updatedData,
      res,
      200,
    );
  } catch (error) {
    console.log(error);
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

// const {  Sequelize } = require("sequelize");
// const DeviceLocationLog = require("../models/deviceLocationLog");

exports.getVisitReport = async (req, res) => {
  try {
    let { employeeId, report_type, year, month, quarter, visit_place } =
      req.body;
   let branchId = req?.users?.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "Branch Id is required", {}, res, 400);
    }
    let startDate;
    let endDate;

    if (report_type == "monthly") {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    }

    if (report_type == "quarterly") {
      const startMonth = (quarter - 1) * 3;
      startDate = new Date(year, startMonth, 1);
      endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);
    }

    let whereCondition = {
      location_type: "pinned",
      branchId,
      tracked_at: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (visit_place) {
      whereCondition.visit_place = visit_place;
    }

    if (employeeId !== "All") {
      whereCondition.employeeId = employeeId;
    }

    const locations = await DeviceLocationLog.findAll({
      attributes: [
        "employeeId",
        "latitude",
        "longitude",
        "tracked_at",
        "visit_place",
        "purpose",
        "remark",
        "address",
      ],
      where: whereCondition,
      order: [["tracked_at", "asc"]],
      raw: true,
    });

    // ================================
    // 🔹 STEP 1: GROUP BY EMPLOYEE + DATE, BUILD ORDERED VISIT LIST
    // ================================
    const employeeDateMap = {};

    locations.forEach((loc) => {
      const visitDate = new Date(loc.tracked_at).toISOString().slice(0, 10);
      const key = `${loc.employeeId}_${visitDate}`;

      if (!employeeDateMap[key]) {
        employeeDateMap[key] = {
          employeeId: loc.employeeId,
          visit_date: visitDate,
          pings: [],
        };
      }

      employeeDateMap[key].pings.push({
        tracked_at: new Date(loc.tracked_at),
        latitude: loc.latitude,
        longitude: loc.longitude,
        visit_place: loc.visit_place,
        purpose: loc.purpose,
        remark: loc.remark,
        address: loc.address,
      });
    });

    // ================================
    // 🔹 STEP 2: DETECT LOCATION CHANGES, CALCULATE DURATION PER VISIT
    // Duration at Location A = first ping at next location - first ping at Location A
    // ================================
    const dateGrouped = {};

    for (const [key, empDay] of Object.entries(employeeDateMap)) {
      // pings already sorted asc from DB query
      const pings = empDay.pings;

      // Group consecutive pings at same location
      const visitSegments = [];
      let segStart = 0;

      for (let i = 1; i <= pings.length; i++) {
        const isDifferentLocation =
          i === pings.length ||
          pings[i].visit_place !== pings[segStart].visit_place ||
          Number(pings[i].latitude).toFixed(5) !== Number(pings[segStart].latitude).toFixed(5) ||
          Number(pings[i].longitude).toFixed(5) !== Number(pings[segStart].longitude).toFixed(5);

        if (isDifferentLocation) {
          const arrivalTime = pings[segStart].tracked_at;
          // Duration = time of first ping at NEXT location - arrival time
          // For last segment: last ping - first ping (or 0 if single ping)
          const departureTime =
            i < pings.length ? pings[i].tracked_at : pings[i - 1].tracked_at;

          visitSegments.push({
            visit_place: pings[segStart].visit_place,
            latitude: pings[segStart].latitude,
            longitude: pings[segStart].longitude,
            address: pings[segStart].address,
            purpose: pings[segStart].purpose,
            remark: pings[segStart].remark,
            date: arrivalTime,
            durationSeconds: (departureTime - arrivalTime) / 1000,
          });

          segStart = i;
        }
      }

      dateGrouped[key] = {
        employeeId: empDay.employeeId,
        visit_date: empDay.visit_date,
        visits: visitSegments.map((v) => ({
          date: v.date,
          visit_place: v.visit_place,
          purpose: v.purpose,
          remark: v.remark,
          latitude: v.latitude,
          longitude: v.longitude,
          address: v.address,
          duration: Helper.formatDuration(v.durationSeconds),
        })),
        totalDurationSeconds: visitSegments.reduce(
          (sum, v) => sum + v.durationSeconds,
          0,
        ),
      };
    }

    const employeeIds = Object.values(dateGrouped).map((i) => i.employeeId);

    const employees = await empPersonal.findAll({
      where: { id: employeeIds },
      attributes: ["id", "firstName", "lastName", "empCode"],
      raw: true,
    });

    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp.id] = emp;
    });

    const result = Object.values(dateGrouped).map((item) => {
      const employee = employeeMap[item.employeeId];

      return {
        emp_name: employee
          ? `${employee.empCode} ${employee.firstName} ${employee.lastName}`
          : "Unknown",

        employeeId: item.employeeId,
        visit_date: item.visit_date,

        total_visits: item.visits.length,
        total_duration: Helper.formatDuration(item.totalDurationSeconds),

        visits: item.visits,
      };
    });

    if (!result.length) {
      return Helper.response(false, "No Data Found", {}, res, 200);
    }

    return Helper.response(true, "Data Found Successfully", result, res, 200);
  } catch (error) {
    console.error(error);

    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getVisitPlace = async (req, res) => {
  try {
    const branchId = req?.users?.branchId;
    console.log("Branch ID:", branchId);
    if (!branchId || branchId == "null") {
      return Helper.response(false, "Branch Id is required", {}, res, 400);
    }
    const tenantId = req?.users?.tenantId;
    const data = await DeviceLocationLog.findAll({
      where: {
        location_type: "pinned",
        branchId,tenantId,
        visit_place: {
          [Op.ne]: null,
        },
       
      },
      attributes: ["visit_place"],
      group: ["visit_place"],
      raw: true,
    });
    if (data.length == 0) {
      return Helper.response(false, "No data Found", {}, res, 200);
    }
    return Helper.response(true, "Data Found Successfully", data, res, 200);
  } catch (error) {
    console.log(error);
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

// exports.addressDropDown=async(req,res)=>{

//   try {
//    const address=await DeviceLocationLog.findAll({
//     where:{

//     },
//     attributes:["address","longitude","latitude"],
//     raw:true
//    })

//   } catch (error) {

//     console.log(error);

//     return Helper.response(
//       false,
//       error?.message,
//       {},
//       res,
//       500
//     );

//   }
// }
