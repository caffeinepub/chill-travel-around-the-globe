import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Iter "mo:base/Iter";

module {
  // Old ScheduleItem type
  type OldScheduleItem = {
    date : Time.Time;
    time : Text;
    location : Text;
    activity : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Old Actor type with its non-transient variables
  type OldActor = {
    journeySchedules : OrderedMap.Map<Text, [OldScheduleItem]>;
  };

  // New ScheduleItem type with journeyCity field
  type NewScheduleItem = {
    date : Time.Time;
    time : Text;
    location : Text;
    activity : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    journeyCity : Text;
  };

  // New Actor type with its non-transient variables
  type NewActor = {
    journeySchedules : OrderedMap.Map<Text, [NewScheduleItem]>;
  };

  // Migration function called by the main actor via the with-clause
  public func run(old : OldActor) : NewActor {
    let textMap = OrderedMap.Make<Text>(Text.compare);

    // Migrate journeySchedules from old to new format
    let journeySchedules = textMap.map<[OldScheduleItem], [NewScheduleItem]>(
      old.journeySchedules,
      func(journeyCity : Text, scheduleItems : [OldScheduleItem]) : [NewScheduleItem] {
        Iter.toArray(
          Iter.map<OldScheduleItem, NewScheduleItem>(
            Iter.fromArray(scheduleItems),
            func(oldItem : OldScheduleItem) : NewScheduleItem {
              {
                oldItem with
                journeyCity;
              };
            }
          )
        );
      }
    );

    // Return migrated state
    { journeySchedules };
  };
};
