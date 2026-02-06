import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Registry "registry";
import Prim "mo:prim";
import Debug "mo:base/Debug";

mixin(storage : Registry.Registry) {
  type _CaffeineStorageRefillInformation = {
    proposed_top_up_amount : ?Nat;
  };

  type _CaffeineStorageRefillResult = {
    success : ?Bool;
    topped_up_amount : ?Nat;
  };

  type _CaffeineStorageCreateCertificateResult = {
    method : Text;
    blob_hash : Text;
  };

  public shared ({ caller }) func _caffeineStorageRefillCashier(refillInformation : ?_CaffeineStorageRefillInformation) : async _CaffeineStorageRefillResult {
    let cashier = await Registry.getCashierPrincipal();
    if (cashier != caller) {
      Debug.trap("Unauthorized access");
    };
    await Registry.refillCashier(storage, cashier, refillInformation);
  };

  public shared ({ caller }) func _caffeineStorageUpdateGatewayPrincipals() : async () {
    await Registry.updateGatewayPrincipals(storage);
  };

  public query ({ caller }) func _caffeineStorageBlobsToDelete() : async [Text] {
    if (not Registry.isAuthorized(storage, caller)) {
      Debug.trap("Unauthorized access");
    };
    let deadBlobs = Registry.getBlobsToRemove(storage);
    Array.subArray(deadBlobs, 0, Nat.min(10000, Array.size(deadBlobs)));
  };

  public shared ({ caller }) func _caffeineStorageConfirmBlobDeletion(blobs : [Text]) : async () {
    if (not Registry.isAuthorized(storage, caller)) {
      Debug.trap("Unauthorized access");
    };
    ignore Registry.clearBlobsRemoved(storage, blobs);
  };

  public shared ({ caller }) func _caffeineStorageCreateCertificate(blob_hash : Text) : async _CaffeineStorageCreateCertificateResult {
    {
      method = "upload";
      blob_hash;
    };
  };
};
