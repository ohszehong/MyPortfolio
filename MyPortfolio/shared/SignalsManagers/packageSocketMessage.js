import SocketMessageTypes from "../Standards/StringKeys/SocketMessageTypes.json" with { type: "json" };

export default function packageSocketMessageForSingleUser(
  cassetteIndex,
  socketMessageType,
  userId,
  message,
) {
  return {
    cassetteIndex: cassetteIndex,
    type: socketMessageType,
    value: {
      userId: userId,
      message: message,
    },
  };
}

export function packageSocketMessageForAllUsers(
  cassetteIndex,
  socketMessageType,
  message,
) {
  return {
    cassetteIndex: cassetteIndex,
    type: socketMessageType,
    value: message,
  };
}
