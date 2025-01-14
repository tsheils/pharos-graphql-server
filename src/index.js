//
// Edit as appropriate
//
const DBHOST = 'tcrd.ncats.io';
const DBNAME = 'tcrd610';

////////////////////////////////////////////////////////////////////////////////
// DON'T EDIT BELOW UNLESS YOU KNOW WHAT YOU'RE DOING!
////////////////////////////////////////////////////////////////////////////////
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('graphql-tools');
const { find, filter, slice } = require('lodash');
const TCRD = require('./TCRD');


const typeDefs = `

type Xref {
     source: String!
     name: String!
     value: String
     targets(tdl: String = "", fam: String = ""): [Target]
}

type Prop {
     name: String!
     value: String!
}

type IntProp {
     name: String!
     value: Int!
}

type FloatProp {
     name: String!
     value: Float!
}

type TemporalCount {
     year: Int!
     count: Int!
}

type TemporalScore {
     year: Int!
     score: Float!
}

type Facet {
     facet: String!
     count: Int
     values (skip: Int=0, top: Int=10, name: String): [IntProp]
}

input IFilterFacet {
     facet: String!
     values: [String]
}

type FilterFacet {
     facet: String!
     values: [String]
}

"""Input IRangeFloat: [start, end)"""
input IRangeInt {
     name: String!
     start: Int
     end: Int
}

"""Input IRangeFloat: [start, end) when start & end are specified;
if start is not specified, then < end. Otherwise if end is not specified,
then the range >= start is assumed."""
input IRangeFloat {
     name: String!
     start: Float
     end: Float
}

input IFilter {
     term: String
     facets: [IFilterFacet]
     irange: [IRangeInt]
     frange: [IRangeFloat]
     order: String
}

type Filter {
     term: String
     facets: [FilterFacet]
}

type PantherPath {
     pcid: String!
     name: String!
     parents: [PantherPath]
}

type PantherClass {
     pcid: String!
     name: String!
     parents: [String]
}

type Pathway {
     pwid: Int!
     type: String!
     name: String!
     targetCounts: [IntProp]
     targets(skip: Int=0, top: Int=10, filter: IFilter): [Target]
}

input ITarget {
     tcrdid: Int
     uniprot: String
     geneid: Int
     sym: String
     stringid: String
}

type PubMed {
     pmid: String!
     title: String
     journal: String
     date: String
     year: Int
     abstract: String
     targetCounts: [IntProp]
     targets(skip: Int=0, top: Int=10, filter: IFilter): [Target]
}

type GeneRIF {
     rifid: Int!
     text: String
     target: Target!
     pubs: [PubMed]
}

"""Ortholog"""
type Ortholog {
     orid: Int!
     species: String!
     sym: String
     name: String!
     dbid: String
     geneid: Int
     source: [String]
     diseases: [OrthologDisease]
}

type OrthologDisease {
     ordid: Int!
     score: Float!
     diseases: [Disease]
}

"""Disease entity"""
type Disease {
     name: String!
     associationCount: Int!
     associations (skip: Int=0, top: Int=10): [DiseaseAssociation]
}

type DiseaseAssociation {
     disassid: Int!
     type: String!
     name: String!
     did: String
     description: String
     zscore: Float
     evidence: String
     conf: Float
     reference: String
     drug: String
     log2foldchange: Float
     pvalue: Float
     score: Float
     source: String

     targetCounts: [IntProp]
     targets (skip: Int=0, top: Int=10, filter: IFilter): [Target]
}

"""Target relationships such as PPI"""
type TargetNeighbor {
     nid: Int!
     type: String!
     props: [Prop]
     target: Target!
}

"""LocSigDB: database of protein localization signals"""
type LocSig {
     locid: Int!
     location: String!
     signal: String!
     pubs: [PubMed]
}

"""LINCS: Library of Integrated Network-Based Cellular Signatures"""
type LINCS {
     lncsid: Int!
     cellid: String!
     zscore: Float
     smiles: String
     targets (skip: Int=0, top: Int=10, filter: IFilter): [Target]
}

type Uberon {
     uid: String!
     name: String!
     def: String
     comment: String
}

"""Expression entity"""
type Expression {
     expid: Int!
     type: String!
     tissue: String!
"""quality value: enum('Not detected','Low','Medium','High')"""
     qual: String
     value: String
     evidence: String
     zscore: Float
     conf: Float
"""BrendaTissue ontology"""
     btoid: String
     cellid: String
     uberon: Uberon
     pub: PubMed
}

type GO {
     goid: String!
"""type: 'C' - component, 'F' - function, 'P' - process"""
     type: String!
     term: String!
     evidence: String
     goeco: String
}

type MIM {
     mimid: Int!
     term: String!
}

"""GWAS catalog data"""
type GWAS {
     gwasid: Int!
     trait: String!
     snps: [Prop]
     pvalue: Float
     pub: PubMed
}

"""Harmonizome"""
type Harmonizome {
     target: Target!
     count: Int
     attrs: [GeneAttribute]
"""which must be one of 'type', 'group', or 'category'"""
     summary (which: String="type"): [FloatProp]
}

type GeneAttribute {
     gaid: Int!
     gat: GeneAttributeType!
     count: Int!
     cdf: Float!
}

"""Gene attribute type associated with harmonizome entry"""
type GeneAttributeType {
     gatid: Int!
     name: String!
     association: String
     description: String
"""resource_group in table gene_attribute_type"""
     category: String
     group: String
     type: String
     pubs: [PubMed]
     url: String
}

"""Ligand"""
type Ligand {
"""identify associated with this ligand; for small molecule it's the lychi hash"""
     ligid: String
"""recognized name for the ligand"""
     name: String
"""nlm description of the drug"""
     description: String
"""is ligand an approved drug?"""
     isdrug: Boolean
     synonyms: [Prop]
"""molecular structure of ligand if small molecule"""
     smiles: String
"""Activity count"""
     actcnt: Int
     activities (all: Boolean = true): [LigandActivity]
}

type LigandActivity {
     actid: Int!
"""activity type; e.g., IC50"""
     type: String
     value: Float
"""mode of action; e.g., INHIBITOR"""
     moa: String
     reference: String
     ligand: Ligand!
     target: Target!
     pubs: [PubMed]
}

type DiseaseOntology {
     doid: String
     name: String
     def: String
     parents: [DiseaseOntology]
     children: [DiseaseOntology]
}

type DTO {
     dtoid: String!
     name: String!
     parent: DTO
     children: [DTO]
}

type TINXDisease { 
     tinxid: Int!
"""Disease novelty"""
     novelty: Float
"""Importance of disease-target combination"""
     score: Float
     disease: DiseaseOntology!
}

type TINXTarget {
"""Target novelty"""
     novelty: Float
"""Importance of disease-target combination"""
     score: Float
     target: Target!
}

"""Target entity"""
type Target {
"""Internal TCRD ID; should not be used externally!"""
     tcrdid: Int!
"""UniProt Accession"""
     uniprot: String!
"""Target name"""
     name: String!
"""Gene symbol"""
     sym: String
"""Summary of gene/protein"""
     description: String
"""Target development leve"""
     tdl: String
"""Target family"""
     fam: String
     seq: String!
"""Target novelty score"""
     novelty: Float

"""DTO hierarchy if avaiable"""
     dto: [DTO]

"""Properties and cross references"""
     props(name: String = ""): [Prop]
     synonyms(name: String = ""): [Prop]
     xrefs(source: String = ""): [Xref]

"""Publications associated with this protein"""
     pubCount: Int
     pubs(skip: Int = 0, top: Int = 10, term: String = ""): [PubMed]

"""GeneRIF information"""
     generifCount: Int
     generifs(skip: Int = 0, top: Int = 10, term: String=""): [GeneRIF]

"""Protein-protein interaction"""
     ppiCounts: [IntProp]
     ppis(skip: Int = 0, top: Int = 10, filter: IFilter): [TargetNeighbor]

"""Disease associations"""
     diseaseCounts: [IntProp]
     diseases(skip: Int=0, top: Int=10, type: [String]=[]): [Disease]

"""Patent information"""
     patentCounts: [TemporalCount]
     pubTatorScores: [TemporalScore]
     pubmedScores: [TemporalScore]

"""Panther protein ontology"""
     pantherPaths: [PantherPath]
     pantherClasses: [PantherClass]

"""Pathway information"""
     pathwayCounts: [IntProp]
     pathways(skip: Int=0, top: Int=10, type: [String]=[]): [Pathway]

"""Protein signal localization"""
     locsigs: [LocSig]

"""LINCS: Library of Integrated Network-Based Cellular Signatures"""
     lincs (skip: Int=0, top: Int=10, cellid: [String]=[]): [LINCS]
     lincsCounts: [IntProp]

"""Target neighbors expressed as distance in KEGG pathway"""
     kegg(skip: Int=0, top: Int=10, filter: IFilter): [TargetNeighbor]

"""Tissue expression"""
     expressionCounts: [IntProp]
     expressions(skip: Int=0, top: Int=10, filter: IFilter): [Expression]

"""Ortholog protein"""
     orthologCounts: [IntProp]
     orthologs(skip: Int=0, top: Int=10, filter: IFilter): [Ortholog]

"""GWAS catalog"""
     gwasCounts: [IntProp]
     gwas(skip: Int=0, top: Int=10, filter: IFilter): [GWAS]

"""GO terms"""
     goCounts: [IntProp]
     go(skip: Int=0, top: Int=20, filter: IFilter): [GO]

"""MIM terms"""
     mimCount: Int
     mim: [MIM]

"""Harmonizome data"""
     harmonizome: Harmonizome

"""Ligand activity data"""
     ligandCounts: [IntProp]
     ligands(skip: Int=0, top: Int=20, isdrug: Boolean = false, 
             filter: IFilter): [Ligand]

"""TINX"""
     tinxCount: Int
     tinx(skip: Int=0, top: Int=20, filter: IFilter): [TINXDisease]
}

type TargetResult {
     filter: Filter
     count: Int
     facets (include: [String], exclude: [String]): [Facet]
     targets(skip: Int=0, top: Int=10): [Target]
}

type DiseaseResult {
     filter: Filter
     count: Int
     facets (include: [String], exclude: [String]): [Facet]
     diseases(skip: Int=0, top: Int=10): [Disease]
}

type LigandResult {
     filter: Filter
     count: Int
     facets (include: [String], exclude: [String]): [Facet]
     ligands(skip: Int=0, top: Int=10): [Ligand]
}

type PubResult {
     filter: Filter
     count: Int
     facets (include: [String], exclude: [String]): [Facet]
     pubs(skip: Int=0, top: Int=10): [PubMed]
}

type OrthologResult {
     filter: Filter
     count: Int
     facets (include: [String], exclude: [String]): [Facet]
     orthologs(skip: Int=0, top: Int=10): [Ortholog]
}

type Result {
     targetResult: TargetResult
     diseaseResult: DiseaseResult
     ligandResult: LigandResult
     pubResult: PubResult
     orthologResult: OrthologResult
}

type Query {
     targetFacets: [String!]
     targets(skip: Int=0, top: Int=10, 
             facets: [String!], filter: IFilter): TargetResult
     target(q: ITarget): Target

     disease(name: String): Disease
     diseases(skip: Int = 0, top: Int = 10, filter: IFilter): DiseaseResult
     diseaseOntology(doid: String, name: String): [DiseaseOntology]
     doTree: [DiseaseOntology]

     dto: [DTO]
     dtoNode(dtoid: String, name: String): [DTO]

     ligand(ligid: String): Ligand
     ligands(skip: Int=0, top: Int=10, filter: IFilter): LigandResult

     pubCount(term: String = ""): Int
     pubmed(pmid: Int!): PubMed
     pubs(skip: Int=0, top: Int=10, term: String!): PubResult

     orthologCounts: [IntProp]
     orthologs(skip: Int=0, top: Int=10, filter: IFilter): OrthologResult

     search(term: String!, facets: [String!]): Result
     batch(targets: [String], ligands: [String], 
           diseases:[String], filter: IFilter): Result
     xref(source: String!, value: String!): Xref
}
`;

function getTargetFacets (args, tcrd, all) {
    const TARGET_FACETS = [
        ['Target Development Level', tcrd.getTargetTDLCounts(args)],
        ['tdl', tcrd.getTargetTDLCounts(args)],        
        ['UniProt Keyword', tcrd.getTargetUniProtKeywordCounts(args)],
        ['Keyword', tcrd.getTargetUniProtKeywordCounts(args)],
        ['Family', tcrd.getTargetFamilyCounts(args)],
        ['fam', tcrd.getTargetFamilyCounts(args)],
        ['Indication',
         tcrd.getTargetDiseaseCounts(args, 'DrugCentral Indication')],
        ['Monarch Disease', tcrd.getTargetDiseaseCounts(args, 'Monarch')],
        ['UniProt Disease',
         tcrd.getTargetDiseaseCounts(args, 'UniProt Disease')],
        ['Ortholog', tcrd.getTargetOrthologCounts(args)],
        ['IMPC Phenotype', tcrd.getTargetIMPCPhenotypeCounts(args)],
        ['JAX/MGI Phenotype', tcrd.getTargetMGIPhenotypeCounts(args)],
        ['GO Process', tcrd.getTargetGOCounts(args, 'P')],
        ['GO Component', tcrd.getTargetGOCounts(args, 'C')],
        ['GO Function', tcrd.getTargetGOCounts(args, 'F')],
        ['GWAS', tcrd.getTargetGWASCounts(args)],
        ['Expression: CCLE', tcrd.getTargetExpressionCounts(args, 'CCLE')],
        ['Expression: HCA RNA',
         tcrd.getTargetExpressionCounts(args, 'HCA RNA')],
        ['Expression: HPM Protein',
         tcrd.getTargetExpressionCounts(args, 'HPM Protein')],
        ['Expression: HPA', tcrd.getTargetExpressionCounts(args, 'HPA')],
        ['Expression: JensenLab Experiment HPA',
         tcrd.getTargetExpressionCounts(args, 'JensenLab Experiment HPA')],
        ['Expression: HPM Gene',
         tcrd.getTargetExpressionCounts(args, 'HPM Gene')],
        ['Expression: JensenLab Experiment HPA-RNA',
         tcrd.getTargetExpressionCounts(args, 'JensenLab Experiment HPA-RNA')],
        ['Expression: JensenLab Experiment GNF',
         tcrd.getTargetExpressionCounts(args, 'JensenLab Experiment GNF')],
        ['Expression: Consensus',
         tcrd.getTargetExpressionCounts(args, 'Consensus')],
        ['Expression: JensenLab Experiment Exon array',
         tcrd.getTargetExpressionCounts
         (args, 'JensenLab Experiment Exon array')],
        ['Expression: JensenLab Experiment RNA-seq',
         tcrd.getTargetExpressionCounts(args, 'JensenLab Experiment RNA-seq')],
        ['Expression: JensenLab Experiment UniGene',
         tcrd.getTargetExpressionCounts(args, 'JensenLab Experiment UniGene')],
        ['Expression: UniProt Tissue',
         tcrd.getTargetExpressionCounts(args, 'UniProt Tissue')],
        ['Expression: JensenLab Knowledge UniProtKB-RC',
         tcrd.getTargetExpressionCounts
         (args, 'JensenLab Knowledge UniProtKB-RC')],
        ['Expression: JensenLab Text Mining',
         tcrd.getTargetExpressionCounts(args, 'JensenLab Text Mining')],
        ['Expression: JensenLab Experiment Cardiac proteome',
         tcrd.getTargetExpressionCounts
         (args, 'JensenLab Experiment Cardiac proteome')],
        ['Expression: Cell Surface Protein Atlas',
         tcrd.getTargetExpressionCounts(args, 'Cell Surface Protein Atlas')]
    ];

    let facets = new Map (TARGET_FACETS);
    if (args.facets) {
        let subset = new Map ();
        facets.forEach((value, key) => {
            if (find (args.facets, x => {
                var matched = x == key;
                if (!matched) {
                    var re = new RegExp(x, 'i');
                    matched = re.test(key);
                    //console.log('**** '+x+ ' ~ '+key+' => '+matched);
                }
                return matched;
            })) {
                subset.set(key, value);
            }
        });
        
        // make sure facets specified in filter are also included
        if (args.filter && args.filter.facets) {
            for (var i in args.filter.facets) {
                var f = args.filter.facets[i];
                subset.set(f.facet, facets.get(f.facet));
            }
        }
        facets = subset;
    }
    else if (!all) {
        const deffacets = [
            'Target Development Level',
            'Family',
            'IMPC Phenotype',
            'GWAS',
            'Expression: Consensus',
            'Ortholog',
            'UniProt Disease',
            'Keyword'
        ];
        let subset = new Map ();
        deffacets.forEach(x => {
            subset.set(x, facets.get(x));
        });
        facets = subset;
    }
    
    return facets;
}

function getTargetResult (args, tcrd) {
    args.batch = args.targets;
    const facets = getTargetFacets (args, tcrd);
    const fkeys = Array.from(facets.keys());
    
    console.log('!!!! targetResult: args='+JSON.stringify(args)+' keys='+fkeys);
    return Promise.all(Array.from(facets.values())).then(rows => {
        let count = 0;
        rows[0].forEach(x => {
            count += x.value;
        });
        
        let facets = [];
        for (var i in rows) {
            facets.push({
                facet: fkeys[i],
                count: rows[i].length,
                values: rows[i]
            });
        }
        
        return {
            filter: args.filter,
            batch: args.targets,
            count: count,
            facets: facets
        };
    });
}

function getDiseaseResult (args, tcrd) {
    let counts = [
        tcrd.getDiseaseDataSourceCounts(args),
        tcrd.getDiseaseDrugCounts(args),
        tcrd.getDiseaseTDLCounts(args)
    ];
    return Promise.all(counts).then(rows => {
        let facets = [];
        facets.push({
            facet: 'Data Source',
            count: rows[0].length,
            values: rows[0]
        });
        let count = 0;
        rows[0].forEach(x => {
            count += x.value;
        });
        
        facets.push({
            facet: 'Drug',
            count: rows[1].length,
            values: rows[1]
        });
        facets.push({
            facet: 'Target Development Level',
            count: rows[2].length,
            values: rows[2]
        });
        
        return {
            filter: args.filter,
            count: count,
            facets: facets
        };
    });
}

function getLigandResult (args, tcrd) {
    return Promise.all([
        tcrd.getLigandCounts(args),
        tcrd.getDrugCounts(args),
        tcrd.getActivityCounts(args)
    ]).then(rows => {
        let facets = [];
        let ligcnt = 0;
        rows[0].forEach(r => {
            ligcnt += r.cnt;
        });
        let drugcnt = 0;
        rows[1].forEach(r => {
            drugcnt += r.cnt;
        });

        facets.push({
            facet: 'type',
            count: ligcnt+drugcnt,
            values: [
                { name: 'Ligand',
                  value: ligcnt
                },
                { name: 'Drug',
                  value: drugcnt
                }
            ]
        });
        
        let acttypes = new Map();
        let actcnt = 0;
        rows[2].forEach(r => {
            let t = r.act_type;
            let v = acttypes.get(t);
            if (v) {
                acttypes.set(t, v+r.cnt);
            }
            else {
                acttypes.set(t, r.cnt);
            }
            actcnt += r[1];
        });
       
        facets.push({
            facet: 'activity',
            count: actcnt,
            values: Array.from(acttypes)
                .map(x => ({name: x[0], value: x[1]}))
                .sort((x,y) => y.value - x.value)
        });
        
        return {
            filter: args.filter,
            count: ligcnt+drugcnt,
            facets: facets
        };
    }).catch(function (error) {
        console.error(error);
    });
}

function getPubResult (args, tcrd) {
    let counts = [
        tcrd.getPubTDLCounts(args)
    ];
    return Promise.all(counts).then(rows => {
        let facets = [];
        facets.push({
            facet: 'Target Development Level',
            count: rows[0].length,
            values: rows[0]
        });
        
        return {
            filter: args.filter,
            count: tcrd.getPubCount(args)
                .then(rows => {
                    if (rows) return rows[0].cnt;
                    return 0;
                }),
            facets: facets
        };
    });
}

function getOrthologResult (args, tcrd) {
    let counts = [
        tcrd.getOrthologSpeciesCounts(args),
        tcrd.getOrthologTDLCounts(args)
    ];
    return Promise.all(counts).then(rows => {
        let facets = [];
        facets.push({
            facet: 'Species',
            count: rows[0].length,
            values: rows[0]
        });
        let count = 0;
        rows[0].forEach(x => {
            count += x.value;
        });

        facets.push({
            facet: 'Target Development Level',
            count: rows[1].length,
            values: rows[1]
        });
        
        return {
            filter: args.filter,
            count: count,
            facets: facets
        };
    });
}

function filterResultFacets (result, args) {
    let facets = result.facets;
    if (args.include) {
        facets = filter (facets, f => 
                         find (args.include, x => {
                             var matched = x == f.facet;
                             if (!matched) {
                                 var re = new RegExp(x, 'i');
                                 matched = re.test(f.facet);
                             }
                             return matched;
                         }));
    }
    
    if (args.exclude) {
        facets = filter (facets, f =>
                         find (args.exclude, x => {
                             var matched = x == f.facet;
                             if (!matched) {
                                 var re = new RegExp(x, 'i');
                                 matched = re.test(f.facet);
                             }
                             return !matched;
                         }));
    }
    return facets;
}

function toLigand (r, lig) {
    let l = {};
    if (r.lychi_h4) {
        l.ligid = r.lychi_h4;
        if (r.drug) {
            l.isdrug = true;
            l.name = r.drug;
        }
        else {
            l.name = r.cmpd_name_in_src;
            l.isdrug = false;
        }
    }
    else if (r.drug) {
        l.ligid = r.drug;
        l.name = r.drug;
        l.isdrug = true;
    }
    else {
        l.ligid = r.cmpd_id_in_src;
        l.name = r.cmpd_name_in_src;
        l.isdrug = false;
    }
    
    l.smiles = r.smiles;
    l.description = r.nlm_drug_info;
    
    l.synonyms = [];    
    if (r.cmpd_pubchem_cid) {
        let s = { name: 'PubChem',
                  value: r.cmpd_pubchem_cid};
        if (lig)
            lig.synonyms.push(s);
        l.synonyms.push(s);
    }
    if (r.cmpd_id_in_src) {
        let s = { name: r.catype,
                  value: r.cmpd_id_in_src};
        if (lig)
            lig.synonyms.push(s);
        l.synonyms.push(s);
    }
    if (r.cmpd_pubchem_cid) {
        let s = { name: 'PubChem',
                  value: r.cmpd_pubchem_cid};
        if (lig)
            lig.synonyms.push(s);
        l.synonyms.push(s);
    }
    if (r.dcid) {
        let s = { name: 'DrugCentral',
                  value: r.dcid};
        if (lig)
            lig.synonyms.push(s);
        l.synonyms.push(s);
    }
    if (r.reference) {
        let s = { name: r.source,
                  value: r.reference};
        if (lig)
            lig.synonyms.push(s);
        l.synonyms.push(s);
    }
    
    return l;
}

const resolvers = {
    Query: {
        search: async function (_, args, {dataSources}) {
            args.filter = {
                term: args.term
            };

            let t = getTargetResult(args, dataSources.tcrd);
            let d = getDiseaseResult(args, dataSources.tcrd);
            let p = getPubResult(args, dataSources.tcrd);
            let o = getOrthologResult(args, dataSources.tcrd);

            return Promise.all([t, d, p, o]).then(r => {
                return {
                    targetResult: r[0],
                    diseaseResult: r[1],
                    pubResult: r[2],
                    orthologResult: r[3]
                };
            }).catch(function(error) {
                console.error(error);
            });
        },

        targetFacets: async function (_, args, {dataSources}) {
            return getTargetFacets(args, dataSources.tcrd, true).keys();
        },
        
        target: async function (_, args, {dataSources}) {
            const q = dataSources.tcrd.getTarget(args.q);
            return q.then(rows => {
                if (rows) return rows[0];
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        
        targets: async function (_, args, {dataSources}) {
            return getTargetResult (args, dataSources.tcrd);
        },

        disease: async function (_, args, {dataSources}) {
            return dataSources.tcrd.getDisease(args.name)
                .then(rows => {
                    if (rows) return rows[0];
                    return rows;
                }).catch(function (error) {
                    console.error(error);
                });
        },
        diseases: async function (_, args, {dataSources}) {
            return getDiseaseResult (args, dataSources.tcrd);
        },

        ligand: async function (_, args, {dataSources}) {
            return Promise.all([
                dataSources.tcrd.getDrug(args.ligid),
                dataSources.tcrd.getLigand(args.ligid)
            ]).then(rows => {
                let lig = null;                
                if (rows[0]) {
                    rows[0].forEach(r => {
                        if (!lig)
                            lig = toLigand (r);
                        else
                            toLigand (r, lig);
                    });
                    
                    if (lig) {
                        lig.actcnt = rows[0].length;
                    }
                }
                if (rows[1]) {
                    rows[1].forEach(r => {
                        if (!lig) lig = toLigand (r);
                        else toLigand (r, lig);
                    });
                    if (lig) {
                        lig.actcnt += rows[1].length;
                    }
                }
                return lig;
            }).catch(function (error) {
                console.error(error);
            });
        },
        ligands: async function (_, args, {dataSources}) {
            return getLigandResult (args, dataSources.tcrd);
        },
        
        xref: async function (_, args, {dataSources}) {
            const q = dataSources.tcrd.getXref(args);
            return q.then(rows => {
                if (rows) return rows[0];
                return rows;
            }).catch(function(error) {
                console.error(error);
            });            
        },

        pubmed: async function (_, args, {dataSources}) {
            const q = dataSources.tcrd.getPub(args.pmid);
            return q.then(rows => {
                if (rows) {
                    let p = rows[0];
                    p.year = parseInt(p.date);
                    return p;
                }
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        
        pubs: async function (_, args, {dataSources}) {
            args.filter = {
                term: args.term
            };
            return getPubResult (args, dataSources.tcrd);
        },
        pubCount: async function (_, args, {dataSources}) {
            const q = dataSources.tcrd.getPubCount(args);
            return q.then(rows => {
                if (rows) return rows[0].cnt;
                return 0;
            }).catch(function(error) {
                console.error(error);
            });
        },

        orthologCounts: async function (_, args, {dataSources}) {
            const q = dataSources.tcrd.getOrthologCounts();
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        orthologs: async function (_, args, {dataSources}) {
            return getOrthologResult (args, dataSources.tcrd);
        },

        batch: async function (_, args, {dataSources}) {
            let funcs = [
                getTargetResult (args, dataSources.tcrd),
                getDiseaseResult (args, dataSources.tcrd),
                getLigandResult(args, dataSources.tcrd)
            ];
            return Promise.all(funcs).then(r => {
                return {
                    targetResult: r[0],
                    diseaseResult: r[1],
                    ligandResult: r[2] // sigh
                };
            }).catch(function(error) {
                console.error(error);
            });
        },

        doTree: async function (_, args, {dataSources}) {
            let nodes = [];
            let doTree = dataSources.tcrd.doTree;
            for (var key in doTree) {
                let node = doTree[key];
                // only return the root nodes
                if (node.parents.length == 0)
                    nodes.push(node);
            }
            return nodes;
        },
        diseaseOntology: async function (_, args, {dataSources}) {
            return dataSources.tcrd.getDiseaseOntology(args);
        },

        dto: async function (_, args, {dataSources}) {
            let nodes = [];
            let dto = dataSources.tcrd.dto;
            for (var key in dto) {
                let n = dto[key];
                if (!n.parent)
                    nodes.push(n);
            }
            return nodes;
        },
        dtoNode: async function (_, args, {dataSources}) {
            return dataSources.tcrd.getDTO(args);
        }
    },
    
    Target: {
        dto: async function (target, args, {dataSources}) {
            return dataSources.tcrd.getDTO(target);
            
            let nodes = [];
            if (target.dtoid) {
                console.log('~~~~~ target: '+target.tcrdid+' '+target.dtoid);
                let n = dataSources.tcrd.dto[target.dtoid];
                while (n) {
                    nodes.push(n);
                    n = n.parent;
                }
            }
            return nodes;
        },
        
        xrefs: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getXrefsForTarget(target);
            return q.then(rows => {
                if (args.source !== "")
                    return filter (rows, {source: args.source});
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        
        props: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPropsForTarget(target);
            return q.then(rows => {
                if (args.name !== "" && args.name !== "*") {
                    rows = filter (rows, {itype: args.name});
                }
                return rows.map(r => {
                    //console.log(r);
                    if (r.number_value != null)
                        return {'name': r.itype,
                                'value': r.number_value.toString()};
                    else if (r.integer_value != null)
                        return {'name': r.itype,
                                'value': r.integer_value.toString()};
                    else if (r.boolean_value != null)
                        return {'name': r.itype,
                                'value': r.boolean_value.toString()};
                    else if (r.date_value != null)
                        return {'name': r.itype,
                                'value': r.date_value.toString()};
                    return {'name': r.itype,
                            'value': r.string_value};
                });
            }).catch(function(error) {
                console.error(error);
            });
        },

        synonyms: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getSynonymsForTarget(target);
            return q.then(rows => {
                if (args.name !== "") {
                    return filter (rows, x => {
                        var matched = x.name == args.name;
                        if (!matched) {
                            var re = new RegExp (args.name, 'i');
                            matched = re.test(x.name);
                        }
                        return matched;
                    });
                }
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        pubCount: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPubCountForTarget(target);
            return q.then(rows => {
                if (rows) return rows[0].cnt;
                return 0;
            }).catch(function(error) {
                console.error(error);
            });
        },
        
        pubs: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPubsForTarget(target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        generifCount: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getGeneRIFCount(target);
            return q.then(rows => {
                if (rows) return rows[0].cnt;
                return 0;
            }).catch(function(error) {
                console.error(error);
            });
        },

        generifs: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getGeneRIFs(target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        ppiCounts: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPPICountsForTarget(target);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        ppis: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPPIsForTarget(target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        diseaseCounts: async function (target, _, {dataSources}) {
            const q = dataSources.tcrd.getDiseaseCountsForTarget(target);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        diseases: async function (target, args, {dataSources}, info) {
            //console.log('##### info: '+JSON.stringify(info));
            const q = dataSources.tcrd.getDiseasesForTarget(target, args);
            return q.then(rows => {
                let diseases = filter (rows, r => r.name != null
                                       && r.associationCount > 0);
                diseases.forEach(x => x.parent = target);
                return diseases;
            }).catch(function(error) {
                console.error(error);
            });
        },

        patentCounts: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPatentCounts(target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        pubTatorScores: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPubTatorScores(target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        pubmedScores: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPubMedScores(target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        pantherPaths: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPanther(target);
            return q.then(rows => {
                let classes = {};
                let children = {};
                for (var i in rows) {
                    let r = rows[i];
                    let toks = r.parent_pcids.split('|');
                    let p = {'pcid':r.pcid,
                             'name':r.name,
                             'parents': []};
                    let unique = {};
                    for (var j in toks) {
                        if (unique[toks[j]] == undefined
                            && toks[j] !== 'PC00000') {
                            p.parents.push(toks[j]);
                            children[toks[j]] = r.pcid;
                        }
                        unique[toks[j]] = 1;
                    }
                    classes[r.pcid] = p;
                }

                let panthers = [];
                for (var i in classes) {
                    let p = classes[i];
                    let parents = p.parents;
                    p.parents = [];
                    for (var j in parents) {
                        p.parents.push(classes[parents[j]]);
                    }
                    if (children[i] == undefined)
                        panthers.push(p);
                }
                return panthers;
            }).catch(function(error) {
                console.error(error);
            });
        },

        pantherClasses: async function (target, _, {dataSources}) {
            const q = dataSources.tcrd.getPanther(target);
            return q.then(rows => {
                let classes = [];
                for (var i in rows) {
                    let r = rows[i];
                    let toks = r.parent_pcids.split('|');
                    let p = {'pcid':r.pcid,
                             'name':r.name,
                             'parents': []};
                    let unique = {};
                    for (var j in toks) {
                        if (unique[toks[j]] == undefined
                            && toks[j] !== 'PC00000') {
                            p.parents.push(toks[j]);
                        }
                        unique[toks[j]] = 1;
                    }
                    classes.push(p);
                }
                return classes;
            }).catch(function(error) {
                console.error(error);
            });
        },

        pathwayCounts: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPathwayCounts(target);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        pathways: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getPathways(target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        locsigs: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getLocSigsForTarget(target);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        lincsCounts: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getLINCSCountsForTarget(target);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        lincs: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getLINCSForTarget(target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        kegg: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getKeggDistancesForTarget(target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        expressionCounts: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getExpressionCountsForTarget(target);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        expressions: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getExpressionsForTarget(target, args);
            return q.then(rows => {
                return rows.map(x => {
                    if (x.number_value)
                        x.value = x.number_value;
                    else if (x.boolean_value)
                        x.value = x.boolean_value;
                    else if (x.string_value)
                        x.value = x.string_value;
                    return x;
                });
            }).catch(function(error) {
                console.error(error);
            });
        },

        orthologCounts: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getOrthologCountsForTarget(target);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        orthologs: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getOrthologsForTarget(target, args);
            return q.then(rows => {
                return rows.map(x => {
                    if (x.sources) {
                        x.source = x.sources.split(',').map(z => z.trim());
                    }
                    return x;
                });
            }).catch(function(error) {
                console.error(error);
            });
        },

        gwasCounts: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getGWASCountsForTarget(target);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        gwas: async function (target, args, {dataSources}) {
            const q = dataSources.tcrd.getGWASForTarget(target, args);
            return q.then(rows => {
                rows.forEach(x => {
                    let snps = x._snps.split(';');
                    let ctx = x.context.split(';');
                    if (snps.length == ctx.length) {
                        let data = [];
                        for (var i in snps) {
                            data.push({name: ctx[i], value:snps[i]});
                        }
                        x.snps = data;
                    }
                    else {
                        console.error(x.gwasid+': invalid parallel '
                                      +'arrays in gwas snp!');
                    }
                });
                
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        goCounts: async function (target, _, {dataSources}) {
            return dataSources.tcrd.getGOCountsForTarget(target)
                .then(rows => {
                    return rows;
                }).catch(function(error) {
                    console.error(error);
                });
        },
        go: async function (target, args, {dataSources}) {
            return dataSources.tcrd.getGOTermsForTarget(target, args)
                .then(rows => {
                    return rows;
                }).catch(function(error){
                    console.error(error);
                });
        },

        mimCount: async function (target, _, {dataSources}) {
            const q= dataSources.tcrd.getMIMCountForTarget(target);
            return q.then(rows => {
                if (rows) return rows[0].cnt;
                return 0;
            }).catch(function(error){
                console.error(error);
            });
        },
        mim: async function (target, args, {dataSources}) {
            return dataSources.tcrd.getMIMForTarget(target, args)
                .then(rows => {
                    return rows;
                }).catch(function(error) {
                    console.error(error);
                });
        },

        harmonizome: async function (target, args, {dataSources}) {
            return {target: target};
        },

        ligandCounts: async function (target, args, {dataSources}) {
            return Promise.all([
                dataSources.tcrd.getLigandCountForTarget(target),
                dataSources.tcrd.getDrugCountForTarget(target)
            ]).then(rows => {
                let ligcnt = 0;
                rows[0].forEach(r => {
                    ligcnt += r.cnt;
                });
                let drugcnt = 0;
                rows[1].forEach(r => {
                    drugcnt += r.cnt;
                });
                return [{
                    name: "ligand",
                    value: ligcnt
                },{
                    name: "drug",
                    value: drugcnt
                }];
            }).catch(function(error){
                console.error(error);
            });
        },
        ligands: async function (target, args, {dataSources}) {
            /*
             * TODO: need to rework to use the ncats_ligand_labels table
             */
            return Promise.all([
                dataSources.tcrd.getLigandLabelsForTarget(target, args),
                dataSources.tcrd.getDrugLabelsForTarget(target, args)
            ]).then(rows => {
                let unique = new Map();
                rows.forEach(r => {
                    r.forEach(rr => {
                        let cnt = unique.get(rr.label);
                        if (cnt)
                            cnt += rr.cnt;
                        else
                            cnt = rr.cnt;
                        unique.set(rr.label, cnt);
                    });
                });

                let ligands = Array.from(unique.keys());
                return slice (ligands, args.skip, args.top + args.skip);
            }).then(ligands => {
                return Promise.all([
                    dataSources.tcrd.getLigandsForTarget(target, ligands),
                    dataSources.tcrd.getDrugsForTarget(target, ligands)
                ]).then(rows => {
                    const ligs = new Map();

                    if (args.isdrug == false) {
                        rows[0].forEach(r => {
                            let l = toLigand (r);
                            l.parent = target;
                            ligs.set(l.ligid, l);
                        });
                    }

                    rows[1].forEach(r => {
                        let l = toLigand (r);
                        l.parent = target;
                        ligs.set(l.ligid, l);
                    });
                    
                    return Array.from(ligs.values()).sort((a,b) => {
                        if (a.isdrug && !b.isdrug) return -1;
                        if (!a.isdrug && b.isdrug) return 1;
                        return a.name.localeCompare(b.name);
                    });
                });
            }).catch(function(error) {
                console.error(error);
            });
        },

        tinxCount: async function (target, args, {dataSources}) {
            return dataSources.tcrd.getTINXCountForTarget(target)
                .then(rows => {
                    if (rows) return rows[0].cnt;
                    return 0;
                }).catch(function (error) {
                    console.error(error);
                });
        },
        tinx: async function (target, args, {dataSources}) {
            return dataSources.tcrd.getTINXForTarget(target, args)
                .then(rows => {
                    return rows;
                }).catch(function (error) {
                    console.error(error);
                });
        }
    },

    PubMed: {
        targetCounts: async function (pubmed, args, {dataSources}) {
            const q = dataSources.tcrd.getTargetCountsForPubMed(pubmed);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        targets: async function (pubmed, args, {dataSources}) {
            const q = dataSources.tcrd.getTargetsForPubMed(pubmed, args);
            return q.then(rows => {
                rows.forEach(x => {
                    x.parent = pubmed;
                });
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },
    
    Xref: {
        targets: async function (xref, args, {dataSources}) {
            const q = dataSources.tcrd.getTargetsForXref(xref);
            return q.then(rows => {
                if (args.tdl !== "" && args.fam !== "") 
                    return filter (rows, {tdl: args.tdl, fam: args.fam});
                else if (args.tdl !== "")
                    return filter (rows, {tdl: args.tdl});
                else if (args.fam !== "")
                    return filter (rows, {fam: args.fam});
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    GeneRIF: {
        pubs: async function (generif, args, {dataSources}) {
            const q = dataSources.tcrd.getPubsForGeneRIF(generif);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    TargetNeighbor: {
        props: async function (neighbor, args, {dataSources}) {
            let props = [
                {'name': 'tdl', 'value': neighbor.tdl}
            ];

            if (neighbor.novelty)
                props.push({'name': 'novelty', 'value': neighbor.novelty});
            if (neighbor.fam)
                props.push({'name': 'fam', 'value': neighbor.fam});

            if (neighbor.type == 'KEGG') {
                props.push({'name': 'distance', 'value': neighbor.distance});
            }
            else {
                // else assume it's ppi
                if (neighbor.p_int) {
                    props.push({'name': 'p_int',
                                'value': neighbor.p_int});
                }
                if (neighbor.p_ni) {
                    props.push({'name': 'p_ni', 'value': neighbor.p_ni});
                }
                if (neighbor.p_wrong) {
                    props.push({'name': 'p_wrong',
                                'value': neighbor.p_wrong});
                }
                if (neighbor.evidence) {
                    props.push({'name': 'evidence',
                                'value': neighbor.evidence});
                }
                if (neighbor.score) {
                    props.push({'name': 'score', 'value': neighbor.score});
                }
            }
            return props;
        },

        target: async function (neighbor, args, {dataSources}) {
            let q;
            if (neighbor.type == 'KEGG') {
                q = dataSources.tcrd.getTargetForKeggNeighbor(neighbor);
            }
            else {
                q = dataSources.tcrd.getTargetForPPINeighbor(neighbor);
            }
            return q.then(rows => {
                if (rows) return rows[0];
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    Disease: {
        associations: async function (disease, args, {dataSources}) {
            //console.log('~~~~ disease "'+disease.name+'" (parent) = '+disease.parent);
            args.filter = disease.filter;
            const q = dataSources.tcrd
                  .getDiseaseAssociationsForDisease(disease, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },
    
    DiseaseAssociation: {
        targetCounts: async function (disease, _, {dataSources}) {
            const q = dataSources.tcrd
                  .getTargetCountsForDiseaseAssociation(disease);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        targets: async function (disease, args, {dataSources}) {
            const q = dataSources.tcrd
                  .getTargetsForDiseaseAssociation(disease, args);
            return q.then(rows => {
                rows.forEach(x => {
                    x.parent = disease;
                });
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    Pathway: {
        targetCounts: async function (pathway, _, {dataSources}) {
            const q = dataSources.tcrd.getTargetCountsForPathway(pathway);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },

        targets: async function (pathway, args, {dataSources}) {
            const q = dataSources.tcrd.getTargetsForPathway(pathway, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    LocSig: {
        pubs: async function (locsig, args, {dataSources}) {
            const q = dataSources.tcrd.getPubsForLocSig(locsig);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    Expression: {
        uberon: async function (expr, args, {dataSources}) {
            if (expr.uberon_id) {
                return {
                    uid: expr.uberon_id,
                    name: expr.name,
                    def: expr.def,
                    comment: expr.comment
                };
            }
            return null;
        },
        pub: async function (expr, args, {dataSources}) {
            if (expr.pubmed_id) {
                return dataSources.tcrd.getPub(expr.pubmed_id)
                    .then(rows => {
                        if (rows) return rows[0];
                        return rows;
                    }).catch(function(error) {
                        console.error(error);
                    });
            }
            return null;
        }
    },

    Ortholog: {
        diseases: async function (ortho, args, {dataSources}) {
            const q = dataSources.tcrd
                  .getOrthologDiseasesForOrtholog(ortho, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    OrthologDisease: {
        diseases: async function (ortho, args, {dataSources}) {
            const q = dataSources.tcrd
                  .getDiseasesForOrthologDisease(ortho, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    Facet: {
        values: async function (facet, args, _) {
            let values = facet.values;
            if (args.name) {
                values = filter (values, x => {
                    var matched = x.name == args.name;
                    if (!matched) {
                        var re = new RegExp(args.name, 'i');
                        matched = re.test(x.name);
                    }
                    return matched;
                });
            }
            return slice (values, args.skip, args.top + args.skip);
        }
    },

    TargetResult: {
        facets: async (result, args, _) => filterResultFacets (result, args),
        targets: async function (result, args, {dataSources}) {
            args.filter = result.filter;
            args.batch = result.batch;
            return dataSources.tcrd.getTargets(args)
                .then(targets => {
                    return targets;
                }).catch(function(error) {
                    console.error(error);
                });            
        }
    },

    DiseaseResult: {
        facets: async (result, args, _) => filterResultFacets (result, args),
        diseases: async function (result, args, {dataSources}) {
            args.filter = result.filter;
            return dataSources.tcrd.getDiseases(args)
                .then(diseases => {
                    diseases.forEach(x => {
                        x.filter = result.filter;
                    });
                    return diseases;
                }).catch(function(error) {
                    console.error(error);
                });
        }
    },

    LigandResult: {
        facets: async (result, args, _) => filterResultFacets (result, args),
        ligands: async function (result, args, {dataSources}) {
            args.filter = result.filter;
            return dataSources.tcrd.getLigandLabels(args)
                .then(rows => {
                    let values = new Map();
                    rows.forEach(r => {
                        console.log('~~~~~ '+r.label+' '+r.count);
                        values.set(r.label, r.count);
                    });
                    return values;
                }).then(values => {
                    let labels = Array.from(values.keys());
                    return Promise.all([
                        tcrd.getDrugsForLabels(labels),
                        tcrd.getLigandsForLabels(labels)
                    ]).then(rows => {
                        let ligs = new Map();
                        rows.forEach(r => {
                            r.forEach(rr => {
                                let l = toLigand (rr);
                                l.actcnt = values.get(l.ligid);
                                if (!ligs.has(l.ligid) || l.isdrug)
                                    ligs.set(l.ligid, l);
                            });
                        });

                        return Array.from(ligs.values());
                    }).catch(function (error) {
                        console.error(error);
                    });
                }).catch(function (error) {
                    console.error(error);
                });
        }
    },

    PubResult: {
        facets: async (result, args, _) => filterResultFacets (result, args),
        pubs: async function (result, args, {dataSources}) {
            if (result.filter)
                args.term = result.filter.term;
            return dataSources.tcrd.getPubs(args)
                .then(pubs => {
                    pubs.forEach(p => {
                        p.year = parseInt(p.date);
                    });
                    return pubs;
                }).catch(function(error) {
                    console.error(error);
                });
        }
    },

    OrthologResult: {
        facets: async (result, args, _) => filterResultFacets (result, args),
        orthologs: async function (result, args, {dataSources}) {
            if (result.filter)
                args.term = result.filter.term;
            return dataSources.tcrd.getOrthologs(args)
                .then(orthologs => {
                    return orthologs;
                }).catch(function(error) {
                    console.error(error);
                });
        }
    },

    Harmonizome: {
        count: async function (hz, args, {dataSources}) {
            const q = dataSources.tcrd
                  .getGeneAttributeCountForTarget(hz.target, args);
            return q.then(rows => {
                if (rows) return rows[0].cnt;
                return 0;
            }).catch(function(error) {
                console.error(error);
            });
        },
        
        attrs: async function (hz, args, {dataSources}) {
            const q = dataSources.tcrd
                  .getGeneAttributesForTarget(hz.target, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        },
        
        summary: async function (hz, args, {dataSources}) {
            const q = dataSources.tcrd
                  .getGeneAttributeSummaryForTarget(hz.target, args);
            return q.then(rows => {
                let map;
                switch (args.which) {
                case 'group':
                    map = dataSources.tcrd.gaGroups;
                    break;
                case 'category':
                    map = dataSources.tcrd.gaCategories;
                    break;
                default:
                    map = dataSources.tcrd.gaTypes;
                }

                let values = new Map ();
                rows.forEach(r => {
                    values.set(r.name, r.value);
                });

                let stats = [];
                map.forEach(r => {
                    let v = values.get(r);
                    if (v) {
                    }
                    else {
                        v = 0;
                    }
                    stats.push({name: r, value: v});
                });

                return stats;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    GeneAttribute: {
        gat: async function (ga, args, {dataSources}) {
            const q = dataSources.tcrd
                  .getGeneAttributeTypeForGeneAttribute(ga, args);
            return q.then(rows => {
                if (rows) return rows[0];
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    GeneAttributeType: {
        pubs: async function (gat, args, {dataSources}) {
            let q = dataSources.tcrd.getPubsForGeneAttributeType(gat, args);
            return q.then(rows => {
                return rows;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    Ligand: {
        activities: async function (ligand, args, {dataSources}) {
            return Promise.all([
                dataSources.tcrd.getDrugActivities(ligand, args),
                dataSources.tcrd.getLigandActivities(ligand, args)
            ]).then(rows => {
                let ligact = [];
                rows.forEach(r => {
                    r.forEach(rr => {
                        let act = {
                            actid: rr.id,
                            type: rr.act_type,
                            value: rr.act_value,
                            moa: rr.action_type,
                            target_id: rr.target_id,
                            parent: ligand
                        };
                        ligact.push(act);
                    });
                });
                return ligact;
            }).catch(function(error) {
                console.error(error);
            });
        }
    },

    LigandActivity: {
        target: async function (ligact, args, {dataSources}) {
            return dataSources.tcrd.getTarget({ tcrdid: ligact.target_id})
                .then(rows => {
                    return rows[0];
                }).catch(function(error) {
                    console.error(error);
                });
        }
    },

    TINXDisease: {
        disease: async function (tinx, _, {dataSources}) {
            //console.log('~~~~~ tinx: '+tinx.doid);
            if (tinx.doid)
                return dataSources.tcrd.doTree[tinx.doid];
            console.error('No doid in TINX '+tinx.tinxid);
            return null;
        }
    }
};

const schema = makeExecutableSchema({
    typeDefs,
    resolvers
});

const tcrdConfig = {
    client: 'mysql',
    connection: {
        host: DBHOST,
        user: 'tcrd',
        password: '',
        database: DBNAME
    },
    pool: {
        min: 2,
        max: 10,
        createTimeoutMillis: 3000,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
        propagateCreateError: false // <- default is true, set to false
    }
};

const tcrd = new TCRD(tcrdConfig);
const server = new ApolloServer({
    schema: schema,
    introspection: true,
    playground: true,
    dataSources: () => ({
        tcrd: tcrd
    })
});

// Initialize the app
const app = express();

server.applyMiddleware({
    app,
    path: '/graphql'
});

const PORT = process.env.PORT || 4000;
app.listen({port: PORT}, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`)
});
