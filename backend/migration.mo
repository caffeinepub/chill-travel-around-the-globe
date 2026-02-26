import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Time "mo:base/Time";

module {
  // Old Journey type
  type OldJourney = {
    city : Text;
    startDate : Time.Time;
    endDate : Time.Time;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // New Journey type
  type NewJourney = {
    id : Nat;
    city : Text;
    customTitle : ?Text;
    startDate : Time.Time;
    endDate : Time.Time;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Old actor state
  type OldActor = {
    journeys : OrderedMap.Map<Text, OldJourney>;
  };

  // New actor state
  type NewActor = {
    journeysV2 : OrderedMap.Map<Nat, NewJourney>;
    nextJourneyId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let natMap = OrderedMap.Make<Nat>(Nat.compare);

    var newJourneys = natMap.empty<NewJourney>();
    var counter = 1;

    for ((city, journey) in OrderedMap.Make<Text>(Text.compare).entries(old.journeys)) {
      let newJourney : NewJourney = {
        id = counter;
        city = journey.city;
        customTitle = null;
        startDate = journey.startDate;
        endDate = journey.endDate;
        createdAt = journey.createdAt;
        updatedAt = journey.updatedAt;
      };
      newJourneys := natMap.put(newJourneys, counter, newJourney);
      counter += 1;
    };

    {
      journeysV2 = newJourneys;
      nextJourneyId = counter;
    };
  };
};

