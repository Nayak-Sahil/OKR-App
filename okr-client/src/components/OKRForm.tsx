import {useContext, useEffect, useState} from "react";
import Input from "./Input";
import {KeyResultType, ObjectiveType} from "../types/OKRTypes";
import {
    addKeyResultToObjective,
    addOkrsDataToDB,
    generateKeyResultFromLLM,
    updateOkrsDataToDb
} from "../database/OKRStore";
import {BetweenHorizonalStart, Goal, LoaderCircle, Sparkles, Trash2} from "lucide-react";
import {OkrContext} from "../context/OkrProvider";

const defaultKeyResults = {
    title: "",
    initialValue: 0,
    currentValue: 0,
    targetValue: 0,
    metric: "",
};

export default function OKRForm({
                                    objectiveForUpdate,
                                }: {
    objectiveForUpdate: ObjectiveType;
}) {
    const {
        objectives,
        setObjectives,
        isWaitingForResponse,
        setIsWaitingForResponse,
    } = useContext(OkrContext);
    const [isUpdateForm, setIsUpdateForm] = useState<boolean>(false);
    const [newObjective, setNewObjective] = useState<string>("");
    const [keyResults, setKeyResults] = useState<KeyResultType[]>([
        defaultKeyResults,
    ]);

    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    useEffect(() => {
        if (objectiveForUpdate.id) {
            setNewObjective(objectiveForUpdate.objective);
            setKeyResults(objectiveForUpdate.keyResults);
            setIsUpdateForm(true);
        }
    }, [objectiveForUpdate]);

    function handleChange(key: string, value: string | number, index: number) {
        const keyResultToBeUpdated = keyResults[index];
        keyResults[index] = {...keyResultToBeUpdated, [key]: value};

        setKeyResults([...keyResults]);
    }

    function addNewObjective() {
        // validation
        if (newObjective.length == 0 || keyResults.length == 0) {
            alert("Please fill all required field value");
            return;
        }

        // set loader true
        setIsWaitingForResponse(true);
        const objectiveToBeAdded = {objective: newObjective};

        // inserting objective into db.
        addOkrsDataToDB(objectiveToBeAdded)
            .then((objectiveResponse: ObjectiveType) => {
                if (objectives === null) return;
                console.log(keyResults);
                if (keyResults[0].title != "") {
                    addKeyResultToObjective(keyResults, objectiveResponse.id).then((keyResultsResponse) => {
                        const objectiveToBeAddedToState = {...objectiveResponse, keyResults: keyResultsResponse};
                        console.warn(objectiveToBeAddedToState);

                        setObjectives([...objectives, objectiveToBeAddedToState]);
                    })
                } else {
                    setObjectives([...objectives, objectiveResponse]);
                }

                setKeyResults([defaultKeyResults]);
                setNewObjective("");
                setIsWaitingForResponse(false);
            })
            .catch((error) => {
                alert(error)
            });
    }

    function handleGenerateKeyResultFromLLM() {
        if (newObjective.length == 0) {
            alert("Please fill all required field value");
        } else {
            setIsGenerating(true);
            generateKeyResultFromLLM(newObjective).then((keyResult: KeyResultType) => {
                setKeyResults([keyResult]);
                setIsGenerating(false);
            }).catch((error) => {
                alert(error)
                setIsGenerating(false);
            })
        }
    }

    function handleUpdateObjective() {
        setIsWaitingForResponse(true);

        const okrsToBeUpdated = {
            id: objectiveForUpdate.id,
            objective: newObjective,
            keyResults: keyResults.map((keyResult) => {
                return {
                    ...keyResult,
                    id: objectiveForUpdate.keyResults[0].id,
                    objectiveId: objectiveForUpdate.keyResults[0].objectiveId
                }
            }),
        };

        updateOkrsDataToDb(okrsToBeUpdated).then(
            (data) => {
                if (objectives === null) return;
                const updatedObjectives = objectives.map((objective) => {
                    return objective.id === data.id ? okrsToBeUpdated
                        : objective;
                });

                setObjectives([...updatedObjectives]);

                // Reset
                setNewObjective("");
                setKeyResults([defaultKeyResults]);
                setTimeout(() => {
                    setIsUpdateForm(false);
                    setIsWaitingForResponse(false);
                }, 3000);
            }
        );
    }

    function addNewKeyResults() {
        setKeyResults((prev) => [...prev, defaultKeyResults]);
    }

    function deleteKeyResultInputList(selectedInptListMapIndex: number) {
        const updatedKeyResultInptList = keyResults.filter((_m, index) => {
            return index !== selectedInptListMapIndex;
        })

        setKeyResults(updatedKeyResultInptList);
    }

    return (
        <div
            id="addObjective"
            className="w-2/5 h-[90%] overflow-y-scroll space-y-4 rounded-md bg-gray-50 border-1 shadow-md"
        >
            <div className="sticky top-0 bg-gray-50 space-y-8 px-8 py-4 z-10">
                <h1 className="font-medium text-lg mt-2 text-center">
                    <span className="text-primary">Goal</span>Sync - <span
                    className="text-secondary">OKR Application</span>
                </h1>

                <div id="objectForm" className="w-full">
                    <Input
                        label={"Objective"}
                        type="text"
                        placeholder="Enter a objective"
                        className="flex-grow"
                        value={newObjective}
                        onChange={(e) => {
                            setNewObjective(e.target.value);
                        }}
                    />
                </div>
            </div>
            <hr/>
            <div
                className="w-full flex flex-col space-y-4 px-8 py-4"
                id="keyResultForm"
            >
                <div className="w-full flex justify-between items-center">
                    <h2 className="font-medium">
                        Your Objective's Key Results
                    </h2>
                    <button
                        onClick={() => handleGenerateKeyResultFromLLM()}
                        className="bg-white border-2 border-[#12a6a7] hover:border-gray-700 hover:bg-gray-700 hover:text-white text-primary ease-linear flex items-center gap-x-1.5 px-4 py-2 rounded-md text-sm font-medium"
                    >
                        <Sparkles
                            className={`w-4 h-4 -rotate-45 ${isGenerating ? "animate-ping" : ""}`}/> Generate
                    </button>
                </div>
                {keyResults && keyResults.length > 0 && keyResults.map((keyResult, index) => (
                    <div
                        key={index}
                        id="firstKeyResult"
                        className="flex flex-col space-y-2"
                    >
                        <Input
                            label={"Title"}
                            className="flex-grow"
                            value={keyResult.title}
                            type="text"
                            placeholder="Enter a specific key-results of defined objective"
                            onChange={(e) => {
                                handleChange("title", e.target.value, index);
                            }}
                        />
                        <div
                            id="firstKeyResultMetrics"
                            className="flex justify-between flex-wrap gap-y-2 relative"
                        >
                            <button
                                onClick={() => deleteKeyResultInputList(index)}
                                className="bg-white border border-red-500 text-red-500 hover:bg-red-500 hover:text-white absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 shadow-lg hover:shadow-inner rounded-full p-2"
                            >
                                <Trash2 className="w-4 h-4"/>
                            </button>
                            <Input
                                label={"Initial Value"}
                                value={keyResult.initialValue}
                                type="number"
                                placeholder="Initial Value"
                                onChange={(e) => {
                                    handleChange("initialValue", parseInt(e.target.value), index);
                                }}
                            />
                            <Input
                                label={"Current Value"}
                                type="number"
                                value={keyResult.currentValue}
                                placeholder="Current Value"
                                onChange={(e) => {
                                    handleChange("currentValue", parseInt(e.target.value), index);
                                }}
                            />
                            <Input
                                label={"Metric"}
                                type="text"
                                value={keyResult.metric}
                                placeholder="Metrics Value"
                                onChange={(e) => {
                                    handleChange("metric", e.target.value, index);
                                }}
                            />
                            <Input
                                label={"Target Value"}
                                type="number"
                                value={keyResult.targetValue}
                                placeholder="Target Value"
                                onChange={(e) => {
                                    handleChange("targetValue", parseInt(e.target.value), index);
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div
                id="submitButton"
                className="w-full flex justify-between sticky bottom-0 bg-gray-50 px-8 py-5"
            >
                {isUpdateForm ? <button
                        className="bg-secondary hover:bg-gray-800 ease-linear px-4 py-2 rounded-md text-white text-sm font-medium"
                        onClick={() => {
                            setIsUpdateForm(false);
                            setNewObjective("");
                            setKeyResults([defaultKeyResults]);
                        }}>Cancel</button> :
                    <button
                        onClick={addNewKeyResults}
                        className="bg-secondary hover:bg-gray-800 ease-linear px-4 py-2 rounded-md text-white text-sm font-medium flex items-center gap-x-1"
                    >
                        <BetweenHorizonalStart className="w-4 h-4"/>
                        Add Inputs
                    </button>
                }
                <button
                    onClick={isUpdateForm ? handleUpdateObjective : addNewObjective}
                    className="bg-primary hover:bg-gray-800 px-4 py-2 rounded-md text-white text-sm font-medium flex items-center"
                >
                    {isWaitingForResponse && (
                        <LoaderCircle className="w-4 h-4 mr-1 animate-spin"/>
                    )}{" "}
                    {isUpdateForm ? "Update Objective" : <p className="flex items-center gap-x-1">
                        <Goal className="w-4 h-4"/>
                        <span>Set Goal</span>
                    </p>
                    }
                </button>
            </div>
        </div>
    );
}
